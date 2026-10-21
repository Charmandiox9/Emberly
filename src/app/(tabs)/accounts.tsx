import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../../application/services';
import { AccountsScreen } from '../../modules/accounts/presentation/accounts-screen';

export default function AccountsTab(): ReactElement {
  const { accounts, finance } = useServices();
  const router = useRouter();
  return (
    <AccountsScreen
      repository={accounts}
      finance={finance}
      onMovements={(accountId) =>
        router.push({ pathname: '/(tabs)/movements', params: { accountId } })
      }
    />
  );
}
