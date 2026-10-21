import { createMoney, sumMoney } from '../../../shared/domain/money';
import { readAccountBalances } from '../../../shared/storage/account-balances';
import type {
  Database,
  DatabaseRow,
  SqlExecutor,
  SqlValue,
} from '../../../shared/storage/database';
import type {
  AllocationPage,
  AllocationQuery,
  GoalEntry,
  GoalRepository,
  GoalsOverview,
} from '../application/goal-repository';
import {
  createAllocation,
  createGoal,
  goalChanges,
  type Goal,
  type GoalAllocation,
  type GoalChanges,
} from '../domain/goal';

function text(row: DatabaseRow, field: string): string {
  const value = row[field];
  if (typeof value !== 'string') throw new Error('Datos de meta inválidos.');
  return value;
}
function amount(row: DatabaseRow, field: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new Error('Monto de meta inválido.');
  return value;
}
function entry(row: DatabaseRow): GoalEntry {
  const deadline = row['deadline'];
  if (deadline !== null && typeof deadline !== 'string') throw new Error('Fecha de meta inválida.');
  const goal = createGoal({
    id: text(row, 'id'),
    name: text(row, 'name'),
    target: createMoney(amount(row, 'target_minor')),
    deadline,
    createdAt: text(row, 'created_at'),
  });
  const assigned = createMoney(amount(row, 'assigned_minor'));
  if (assigned.amountMinor < 0) throw new Error('Asignación de meta inválida.');
  const delta = goal.target.amountMinor - assigned.amountMinor;
  return {
    ...goal,
    assigned,
    remaining: createMoney(Math.max(0, delta)),
    excess: createMoney(Math.max(0, -delta)),
    complete: delta <= 0,
    percentage: Math.min(
      100,
      Number((BigInt(assigned.amountMinor) * 100n) / BigInt(goal.target.amountMinor)),
    ),
  };
}
function allocationRow(row: DatabaseRow): GoalAllocation {
  const kind = row['kind'];
  if (kind !== 'contribute' && kind !== 'withdraw') throw new Error('Asignación de meta inválida.');
  return createAllocation({
    id: text(row, 'id'),
    goalId: text(row, 'goal_id'),
    kind,
    amount: createMoney(amount(row, 'amount_minor')),
    createdAt: text(row, 'created_at'),
  });
}
async function overview(database: SqlExecutor): Promise<GoalsOverview> {
  const goals = (await database.all('SELECT * FROM goals ORDER BY created_at, id')).map(entry);
  const balance = sumMoney((await readAccountBalances(database)).map((account) => account.balance));
  const assigned = sumMoney(goals.map((goal) => goal.assigned));
  const backed = Math.max(0, balance.amountMinor);
  return {
    goals,
    funding: {
      balance,
      assigned,
      available: createMoney(Math.max(0, backed - assigned.amountMinor)),
      shortfall: createMoney(Math.max(0, assigned.amountMinor - backed)),
    },
  };
}

export class SqliteGoalRepository implements GoalRepository {
  constructor(private readonly database: Database) {}

  async overview(): Promise<GoalsOverview> {
    let result: GoalsOverview | undefined;
    await this.database.transaction(async (transaction) => {
      result = await overview(transaction);
    });
    if (!result) throw new Error('No se pudieron consultar las metas.');
    return result;
  }

  async save(input: Goal): Promise<void> {
    const goal = createGoal(input);
    await this.database.run(
      'INSERT INTO goals (id, name, target_minor, deadline, created_at) VALUES (?, ?, ?, ?, ?)',
      [goal.id, goal.name, goal.target.amountMinor, goal.deadline, goal.createdAt],
    );
  }

  async update(id: string, input: GoalChanges): Promise<void> {
    const changes = goalChanges(input);
    await this.database.transaction(async (transaction) => {
      if (!(await transaction.first('SELECT id FROM goals WHERE id = ?', [id])))
        throw new Error('La meta ya no existe.');
      await transaction.run(
        'UPDATE goals SET name = ?, target_minor = ?, deadline = ? WHERE id = ?',
        [changes.name, changes.target.amountMinor, changes.deadline, id],
      );
    });
  }

  async allocate(input: GoalAllocation): Promise<void> {
    const allocation = createAllocation(input);
    await this.database.transaction(async (transaction) => {
      const previous = await transaction.first('SELECT * FROM goal_allocations WHERE id = ?', [
        allocation.id,
      ]);
      if (previous) {
        const existing = allocationRow(previous);
        if (
          existing.goalId !== allocation.goalId ||
          existing.kind !== allocation.kind ||
          existing.amount.amountMinor !== allocation.amount.amountMinor ||
          existing.createdAt !== allocation.createdAt
        )
          throw new Error('El identificador ya corresponde a otra asignación.');
        return;
      }
      const current = await overview(transaction);
      const goal = current.goals.find((candidate) => candidate.id === allocation.goalId);
      if (!goal) throw new Error('La meta ya no existe.');
      if (allocation.createdAt < goal.createdAt)
        throw new Error('La asignación no puede ser anterior a la meta.');
      if (
        allocation.kind === 'contribute' &&
        (allocation.amount.amountMinor > current.funding.available.amountMinor ||
          allocation.amount.amountMinor > goal.remaining.amountMinor)
      )
        throw new Error('El aporte supera el dinero disponible o lo que falta para la meta.');
      if (
        allocation.kind === 'withdraw' &&
        allocation.amount.amountMinor > goal.assigned.amountMinor
      )
        throw new Error('El retiro supera lo asignado a esta meta.');
      await transaction.run(
        'INSERT INTO goal_allocations (id, goal_id, kind, amount_minor, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          allocation.id,
          allocation.goalId,
          allocation.kind,
          allocation.amount.amountMinor,
          allocation.createdAt,
        ],
      );
      await overview(transaction);
    });
  }

  async history(query: AllocationQuery): Promise<AllocationPage> {
    const limit = query.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Límite de consulta inválido.');
    const params: SqlValue[] = [query.goalId];
    let cursor = '';
    if (query.cursor) {
      const date = new Date(query.cursor.createdAt);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== query.cursor.createdAt ||
        !query.cursor.id.trim() ||
        query.cursor.id.length > 128
      )
        throw new Error('Cursor inválido.');
      cursor = 'AND (created_at < ? OR (created_at = ? AND id < ?))';
      params.push(query.cursor.createdAt, query.cursor.createdAt, query.cursor.id);
    }
    params.push(limit + 1);
    const rows = await this.database.all(
      `SELECT * FROM goal_allocations WHERE goal_id = ? ${cursor} ORDER BY created_at DESC, id DESC LIMIT ?`,
      params,
    );
    const entries = rows.slice(0, limit).map(allocationRow);
    const last = entries.at(-1);
    return {
      entries,
      nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }
}
