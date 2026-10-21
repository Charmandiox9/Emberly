import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import type { ReactElement } from 'react';
import { SummaryScreen } from '../modules/dashboard/presentation/summary-screen';
import { useServices } from './services';
import { StatisticsScreen } from '../modules/statistics/presentation/statistics-screen';

interface SummaryRouteProps {
  readonly mode: 'home' | 'statistics';
}
export function SummaryRoute({ mode }: SummaryRouteProps): ReactElement {
  const { finance, statistics } = useServices();
  const router = useRouter();
  if (mode === 'statistics')
    return (
      <StatisticsScreen
        repository={statistics}
        onHistory={(filters) =>
          router.push({
            pathname: '/(tabs)/movements',
            params: { ...filters, filterRequestId: randomUUID() },
          })
        }
      />
    );
  return (
    <SummaryScreen
      mode={mode}
      repository={finance}
      onAdd={() => router.push('/movement')}
      onAccounts={() => router.push('/accounts')}
      onMore={() => router.navigate('/(tabs)/more')}
      onEdit={(id) => router.push({ pathname: '/movement', params: { id } })}
    />
  );
}
