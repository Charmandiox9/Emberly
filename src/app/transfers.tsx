import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { TransfersScreen } from '../modules/transfers/presentation/transfers-screen';
export default function Transfers(): ReactElement {
  const { transfers, accounts } = useServices();
  const router = useRouter();
  return (
    <TransfersScreen
      repository={transfers}
      accounts={accounts}
      onAccounts={() => router.push('/accounts')}
    />
  );
}
