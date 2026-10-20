import { createMoney, sumMoney, type Money } from '../../../shared/domain/money';

import type { Account } from './account';

export function getInitialBalanceTotal(
  accounts: readonly Account[],
  additionalBalance: Money = createMoney(0),
): Money {
  return sumMoney([...accounts.map((account) => account.initialBalance), additionalBalance]);
}
