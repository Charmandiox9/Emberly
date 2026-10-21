import { createMoney, sumMoney } from '../../../shared/domain/money';
import { readAccountBalances } from '../../../shared/storage/account-balances';
import type { Database, DatabaseRow } from '../../../shared/storage/database';
import type { AccountRepository } from '../application/account-repository';
import {
  createAccount,
  type Account,
  type ManagedAccount,
  type AccountChanges,
} from '../domain/account';

function readAccount(row: DatabaseRow): Account {
  const id = row['id'];
  const name = row['name'];
  const amount = row['initial_balance_minor'];
  const currency = row['currency'];
  const createdAt = row['created_at'];
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof amount !== 'number' ||
    currency !== 'CLP' ||
    typeof createdAt !== 'string'
  ) {
    throw new Error('La cuenta guardada contiene datos inválidos.');
  }
  return createAccount({ id, name, initialBalance: createMoney(amount, currency), createdAt });
}

export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<readonly Account[]> {
    const rows = await this.database.all(
      'SELECT id, name, initial_balance_minor, currency, created_at FROM accounts ORDER BY created_at, id',
    );
    return rows.map(readAccount);
  }

  async save(account: Account): Promise<void> {
    const validated = createAccount(account);
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `INSERT INTO accounts (id, name, initial_balance_minor, currency, created_at)
       VALUES (?, ?, ?, ?, ?)`,
        [
          validated.id,
          validated.name,
          validated.initialBalance.amountMinor,
          validated.initialBalance.currency,
          validated.createdAt,
        ],
      );
      sumMoney((await readAccountBalances(transaction)).map((balance) => balance.balance));
    });
  }

  async listManaged(): Promise<readonly ManagedAccount[]> {
    return (
      await this.database.all('SELECT * FROM accounts ORDER BY archived, created_at, id')
    ).map((row) => {
      if (row['archived'] !== 0 && row['archived'] !== 1)
        throw new Error('Estado de cuenta inválido.');
      return { ...readAccount(row), archived: row['archived'] === 1 };
    });
  }

  async update(id: string, changes: AccountChanges): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const row = await transaction.first('SELECT * FROM accounts WHERE id = ?', [id]);
      if (!row) throw new Error('La cuenta ya no existe.');
      const validated = createAccount({ ...readAccount(row), ...changes });
      await transaction.run(
        'UPDATE accounts SET name = ?, initial_balance_minor = ? WHERE id = ?',
        [validated.name, validated.initialBalance.amountMinor, id],
      );
      sumMoney((await readAccountBalances(transaction)).map((entry) => entry.balance));
    });
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.database.transaction(async (transaction) => {
      if (!(await transaction.first('SELECT id FROM accounts WHERE id = ?', [id])))
        throw new Error('La cuenta ya no existe.');
      await transaction.run('UPDATE accounts SET archived = ? WHERE id = ?', [
        archived ? 1 : 0,
        id,
      ]);
    });
  }
}
