import type { Account, AccountChanges, ManagedAccount } from '../domain/account';

export interface AccountRepository {
  list(): Promise<readonly Account[]>;
  save(account: Account): Promise<void>;
  listManaged(): Promise<readonly ManagedAccount[]>;
  update(id: string, changes: AccountChanges): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}
