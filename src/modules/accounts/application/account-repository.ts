import type { Account } from '../domain/account';

export interface AccountRepository {
  list(): Promise<readonly Account[]>;
  save(account: Account): Promise<void>;
}
