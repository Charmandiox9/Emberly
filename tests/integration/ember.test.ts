import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteBudgetRepository } from '../../src/modules/budgets';
import { SqliteEmberRepository } from '../../src/modules/ember/infrastructure/sqlite-ember-repository';
import { SqliteGoalRepository } from '../../src/modules/goals';
import { SqliteFinanceRepository, type Movement } from '../../src/modules/movements';
import { SqliteTransferRepository } from '../../src/modules/transfers';
import { createMoney } from '../../src/shared/domain/money';
import { migrateDatabase, migrations } from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const timestamp = (day: number): string => `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`;

describe('progreso de Ember sobre SQLite real', () => {
  let database: TestDatabase;
  let finance: SqliteFinanceRepository;
  let accounts: SqliteAccountRepository;
  let goals: SqliteGoalRepository;
  let transfers: SqliteTransferRepository;
  let ember: SqliteEmberRepository;

  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    accounts = new SqliteAccountRepository(database);
    finance = new SqliteFinanceRepository(database);
    goals = new SqliteGoalRepository(database);
    transfers = new SqliteTransferRepository(database);
    ember = new SqliteEmberRepository(database);
    await accounts.save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt: timestamp(1),
    });
    await accounts.save({
      id: 'card',
      name: 'Tarjeta',
      initialBalance: createMoney(0),
      createdAt: timestamp(1),
    });
  });

  afterEach(() => database.close());

  it('cuenta fechas distintas, no registros ni ediciones, y conserva logros tras borrar', async () => {
    const movement = (id: string, day: number): Movement => ({
      id,
      accountId: 'cash',
      categoryId: 'food',
      kind: 'expense',
      amount: createMoney(100),
      description: 'Gasto de prueba',
      date: `2026-10-${String(day).padStart(2, '0')}`,
      createdAt: timestamp(day),
    });

    await finance.save(movement('day-one-a', 2));
    await finance.save({ ...movement('day-one-b', 2), createdAt: '2026-10-02T18:30:00.000Z' });
    await finance.save(movement('day-two', 4));
    expect((await ember.readProgress()).activeDays).toBe(2);

    await finance.save(movement('day-three', 9));
    const progress = await ember.readProgress();
    expect(progress.stage).toBe('ember');
    expect(progress.activeDays).toBe(3);
    expect(progress.achievements.map((achievement) => achievement.id)).toContain(
      'three-active-days',
    );

    await finance.update({ ...movement('day-three', 9), description: 'Corregido' });
    await finance.remove('day-one-a');
    expect(await ember.readProgress()).toEqual(progress);
  });

  it('cuenta transferencias y planificación sin depender de montos ni contar días dobles', async () => {
    await transfers.save({
      id: 'transfer',
      sourceAccountId: 'cash',
      destinationAccountId: 'card',
      amount: createMoney(100),
      description: 'Movimiento entre cuentas',
      date: '2026-10-02',
      createdAt: timestamp(2),
    });
    await goals.save({
      id: 'goal',
      name: 'Viaje',
      target: createMoney(100),
      deadline: null,
      createdAt: timestamp(2),
    });
    await goals.allocate({
      id: 'goal-contribution',
      goalId: 'goal',
      kind: 'contribute',
      amount: createMoney(100),
      createdAt: timestamp(4),
    });
    await new SqliteBudgetRepository(database).save({
      id: 'budget',
      categoryId: 'food',
      month: '2026-10',
      limit: createMoney(500),
      createdAt: timestamp(3),
    });

    const progress = await ember.readProgress();
    expect(progress.activeDays).toBe(3);
    expect(progress.achievements.map((achievement) => achievement.id)).toEqual([
      'first-record',
      'first-plan',
      'three-active-days',
    ]);
  });

  it('reconoce la revisión de estadísticas una sola vez por día y no conserva datos financieros', async () => {
    await ember.recordReview(timestamp(2));
    await ember.recordReview('2026-10-02T18:00:00.000Z');

    expect(await database.all('SELECT * FROM ember_activity_days')).toEqual([
      {
        activity_date: '2026-10-02',
        activity_type: 'review',
        first_recorded_at: timestamp(2),
      },
    ]);
    const progress = await ember.readProgress();
    expect(progress.activeDays).toBe(1);
    expect(progress.achievements.map((achievement) => achievement.id)).toEqual(['first-review']);
  });

  it('alcanza Flarely al décimo día y no duplica hitos por nuevas acciones', async () => {
    for (let day = 2; day <= 11; day += 1) {
      await finance.save({
        id: `movement-${day}`,
        accountId: 'cash',
        categoryId: 'food',
        kind: 'expense',
        amount: createMoney(100),
        description: 'Gasto de prueba',
        date: `2026-10-${String(day).padStart(2, '0')}`,
        createdAt: timestamp(day),
      });
    }
    const firstRead = await ember.readProgress();
    expect(firstRead.stage).toBe('flarely');
    expect(firstRead.activeDays).toBe(10);
    expect(firstRead.achievements.map((achievement) => achievement.id)).toEqual([
      'first-record',
      'three-active-days',
      'ten-active-days',
    ]);

    await finance.save({
      id: 'more-on-same-day',
      accountId: 'cash',
      categoryId: 'food',
      kind: 'expense',
      amount: createMoney(100),
      description: 'Otro gasto',
      date: '2026-10-11',
      createdAt: '2026-10-11T18:00:00.000Z',
    });
    expect(await ember.readProgress()).toEqual(firstRead);
  });

  it('reconoce la actividad guardada al migrar desde el esquema anterior', async () => {
    const legacy = openTestDatabase();
    try {
      await legacy.exec('PRAGMA foreign_keys = ON');
      for (const migration of migrations.filter((entry) => entry.version < 10))
        await legacy.exec(migration.sql);
      await legacy.exec('PRAGMA user_version = 9');
      await legacy.run(
        `INSERT INTO accounts (id, name, initial_balance_minor, currency, created_at)
          VALUES ('legacy-cash', 'Efectivo', 1000, 'CLP', ?)`,
        [timestamp(2)],
      );
      await legacy.run(
        `INSERT INTO movements
          (id, account_id, category_id, kind, amount_minor, description, business_date, created_at)
          VALUES ('legacy-expense', 'legacy-cash', 'food', 'expense', 100, 'Registro anterior', '2026-10-02', ?)`,
        [timestamp(2)],
      );

      await migrateDatabase(legacy);

      const progress = await new SqliteEmberRepository(legacy).readProgress();
      expect(progress.activeDays).toBe(1);
      expect(progress.achievements.map((achievement) => achievement.id)).toEqual(['first-record']);
    } finally {
      legacy.close();
    }
  });
});
