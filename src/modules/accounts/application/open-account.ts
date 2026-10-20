import { createAccount, type Account, type CreateAccountInput } from '../domain/account';
import type { AccountRepository } from './account-repository';

export async function openAccount(
  repository: AccountRepository,
  input: CreateAccountInput,
): Promise<Account> {
  const account = createAccount(input);
  await repository.save(account);
  return account;
}
