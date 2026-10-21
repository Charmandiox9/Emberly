import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { MoreScreen } from '../../modules/dashboard/presentation/more-screen';

export default function More(): ReactElement {
  const router = useRouter();
  return (
    <MoreScreen
      onAccounts={() => router.push('/accounts')}
      onCategories={() => router.push('/categories')}
      onBudgets={() => router.push('/budgets')}
      onSettings={() => router.push('/settings')}
    />
  );
}
