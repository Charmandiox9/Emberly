import { createMoney, sumMoney } from '../../../shared/domain/money';
import { readAccountBalances } from '../../../shared/storage/account-balances';
import type { Database, DatabaseRow } from '../../../shared/storage/database';
import type { AccountRepository } from '../application/account-repository';
import { createAccount, type Account } from '../domain/account';

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
}
