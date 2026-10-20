import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../../application/services';
import { HistoryScreen } from '../../modules/movements/presentation/history-screen';
export default function Movements(): ReactElement {
  const { finance, accounts } = useServices();
  const router = useRouter();
  return (
    <HistoryScreen
      repository={finance}
      accounts={accounts}
      onAdd={() => router.push('/movement')}
      onEdit={(id) => router.push({ pathname: '/movement', params: { id } })}
    />
  );
}
