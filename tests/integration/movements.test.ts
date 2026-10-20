import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openAccount, SqliteAccountRepository } from '../../src/modules/accounts';
import {
  recordMovement,
  SqliteFinanceRepository,
  type Movement,
} from '../../src/modules/movements';
import { createMoney } from '../../src/shared/domain/money';
import {
  migrateDatabase,
  migrations,
  readSchemaVersion,
} from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const expense: Movement = {
  id: 'expense-1',
  accountId: 'cash',
  categoryId: 'food',
  kind: 'expense',
  amount: createMoney(3000),
  description: 'Almuerzo',
  date: '2026-10-20',
  createdAt,
};

describe('movimientos en SQLite real', () => {
  let database: TestDatabase;
  let repository: SqliteFinanceRepository;

  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    repository = new SqliteFinanceRepository(database);
    await openAccount(new SqliteAccountRepository(database), {
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
  });
  afterEach(() => database.close());

  it('calcula saldo actual y flujo mensual sin contar el saldo inicial como ingreso', async () => {
    await repository.save(expense);
    await repository.save({
      ...expense,
      id: 'salary-1',
      kind: 'income',
      categoryId: 'salary',
      amount: createMoney(20000),
    });
    const result = await repository.overview('2026-10');
    expect(result.balance.amountMinor).toBe(27000);
    expect(result.income.amountMinor).toBe(20000);
    expect(result.expenses.amountMinor).toBe(3000);
    expect(result.expenseCategories).toEqual([
      { id: 'food', name: 'Alimentación', total: createMoney(3000) },
    ]);
  });

  it('cambia el mes del movimiento y recalcula ambos periodos al editar', async () => {
    await repository.save(expense);
    await repository.update({ ...expense, date: '2026-09-30', amount: createMoney(4000) });
    expect((await repository.overview('2026-10')).expenses.amountMinor).toBe(0);
    expect((await repository.overview('2026-09')).expenses.amountMinor).toBe(4000);
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(6000);
  });

  it('recalcula las cuentas de origen y destino al cambiar de cuenta', async () => {
    await openAccount(new SqliteAccountRepository(database), {
      id: 'bank',
      name: 'Banco',
      initialBalance: createMoney(5000),
      createdAt,
    });
    await repository.save(expense);
    await repository.update({ ...expense, accountId: 'bank' });
    const overview = await repository.overview('2026-10');
    expect(overview.accounts.find((account) => account.id === 'cash')?.balance.amountMinor).toBe(
      10000,
    );
    expect(overview.accounts.find((account) => account.id === 'bank')?.balance.amountMinor).toBe(
      2000,
    );
  });

  it('elimina un gasto y restaura el saldo sin dejar una fila fantasma', async () => {
    await repository.save(expense);
    await repository.remove(expense.id);
    expect(await repository.get(expense.id)).toBeNull();
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(10000);
    await expect(repository.remove(expense.id)).rejects.toThrow('ya no existe');
  });

  it('permite reflejar deuda real sin convertir el gasto a monto negativo', async () => {
    await repository.save({ ...expense, amount: createMoney(12000) });
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(-2000);
  });

  it('rechaza abrir una cuenta cuyo saldo desborda el total actual y revierte la apertura', async () => {
    await repository.save({
      ...expense,
      id: 'income',
      kind: 'income',
      categoryId: 'salary',
      amount: createMoney(20000),
    });
    const accounts = new SqliteAccountRepository(database);
    await expect(
      openAccount(accounts, {
        id: 'overflow',
        name: 'Cuenta límite',
        initialBalance: createMoney(Number.MAX_SAFE_INTEGER - 10000),
        createdAt,
      }),
    ).rejects.toThrow('rango seguro');
    expect((await accounts.list()).map((account) => account.id)).toEqual(['cash']);
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(30000);
  });

  it('rechaza repetición de un ID y conserva el primer registro', async () => {
    await repository.save(expense);
    await expect(repository.save({ ...expense, amount: createMoney(6000) })).rejects.toThrow();
    expect((await repository.get(expense.id))?.amount.amountMinor).toBe(3000);
  });

  it('exige una cuenta existente y una categoría del mismo tipo', async () => {
    await expect(repository.save({ ...expense, accountId: 'missing' })).rejects.toThrow();
    await expect(repository.save({ ...expense, categoryId: 'salary' })).rejects.toThrow();
    expect((await repository.list({ month: '2026-10' })).entries).toEqual([]);
  });

  it('rechaza montos no positivos, fechas imposibles y conceptos vacíos', async () => {
    for (const input of [
      { ...expense, amount: createMoney(0) },
      { ...expense, amount: createMoney(-1) },
      { ...expense, date: '2026-02-30' },
      { ...expense, description: ' ' },
    ]) {
      await expect(repository.save(input)).rejects.toThrow();
    }
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(10000);
  });

  it('el caso de uso rechaza una fecha futura antes de persistir', async () => {
    await expect(recordMovement(repository, expense, '2026-10-19')).rejects.toThrow('futuro');
    expect(await repository.get(expense.id)).toBeNull();
    await recordMovement(repository, expense, '2026-10-20');
    expect(await repository.get(expense.id)).not.toBeNull();
  });

  it('revierte un ingreso que desborda el saldo seguro', async () => {
    await expect(
      repository.save({
        ...expense,
        kind: 'income',
        categoryId: 'salary',
        amount: createMoney(Number.MAX_SAFE_INTEGER),
      }),
    ).rejects.toThrow('rango seguro');
    expect(await repository.get(expense.id)).toBeNull();
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(10000);
  });

  it('revierte una edición inválida conservando concepto, categoría y monto previos', async () => {
    await repository.save(expense);
    await expect(
      repository.update({ ...expense, categoryId: 'salary', description: 'Cambio fallido' }),
    ).rejects.toThrow();
    expect((await repository.get(expense.id))?.description).toBe('Almuerzo');
    expect((await repository.overview('2026-10')).expenses.amountMinor).toBe(3000);
  });

  it('filtra fechas, tipo, categoría y cuenta sin sumar movimientos de otros meses', async () => {
    await repository.save(expense);
    await repository.save({ ...expense, id: 'past', date: '2026-09-30' });
    await repository.save({ ...expense, id: 'income', kind: 'income', categoryId: 'extra' });
    const page = await repository.list({
      month: '2026-10',
      kind: 'expense',
      accountId: 'cash',
      categoryId: 'food',
    });
    expect(page.entries.map((entry) => entry.id)).toEqual(['expense-1']);
    expect((await repository.overview('2026-10')).expenses.amountMinor).toBe(3000);
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(7000);
  });

  it('pagina por fecha e ID, incluso cuando todos los movimientos comparten fecha', async () => {
    for (const id of ['c', 'b', 'a'])
      await repository.save({ ...expense, id, amount: createMoney(1) });
    const first = await repository.list({ month: '2026-10', limit: 2 });
    expect(first.entries.map((entry) => entry.id)).toEqual(['c', 'b']);
    if (!first.nextCursor) throw new Error('Falta el cursor esperado.');
    const second = await repository.list({ month: '2026-10', limit: 2, cursor: first.nextCursor });
    expect(second.entries.map((entry) => entry.id)).toEqual(['a']);
    expect(second.nextCursor).toBeNull();
  });

  it('no acepta actualizar movimientos que ya no existen', async () => {
    await expect(repository.update(expense)).rejects.toThrow('ya no existe');
    await expect(repository.list({ month: '2026-13', limit: 2 })).rejects.toThrow();
    await expect(repository.list({ month: '2026-10', limit: 500 })).rejects.toThrow();
  });
});

it('actualiza desde esquema 1 conservando cuentas y creando categorías una sola vez', async () => {
  const database = openTestDatabase();
  try {
    const first = migrations[0];
    if (!first) throw new Error('Falta migración inicial.');
    await database.exec(first.sql);
    await database.exec('PRAGMA user_version = 1');
    await openAccount(new SqliteAccountRepository(database), {
      id: 'legacy',
      name: 'Cuenta existente',
      initialBalance: createMoney(40000),
      createdAt,
    });
    await migrateDatabase(database);
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(2);
    const repository = new SqliteFinanceRepository(database);
    expect((await repository.categories()).length).toBe(9);
    expect((await repository.overview('2026-10')).balance.amountMinor).toBe(40000);
  } finally {
    database.close();
  }
});
