import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { AccountsScreen } from '../modules/accounts/presentation/accounts-screen';
export default function Accounts(): ReactElement {
  const { accounts, finance } = useServices();
  return <AccountsScreen repository={accounts} finance={finance} />;
}
