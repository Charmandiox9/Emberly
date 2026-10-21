import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { MoreScreen } from '../../modules/dashboard/presentation/more-screen';

export default function More(): ReactElement {
  const router = useRouter();
  return (
    <MoreScreen
      onBudgets={() => router.push('/budgets')}
      onSettings={() => router.push('/settings')}
      onStatistics={() => router.push('/(tabs)/statistics')}
    />
  );
}
