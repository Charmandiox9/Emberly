import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useCallback, type ReactElement } from 'react';
import { SummaryScreen } from '../modules/dashboard/presentation/summary-screen';
import { useServices } from './services';
import { StatisticsScreen } from '../modules/statistics/presentation/statistics-screen';

interface SummaryRouteProps {
  readonly mode: 'home' | 'statistics';
}
export function SummaryRoute({ mode }: SummaryRouteProps): ReactElement {
  const { finance, statistics, ember } = useServices();
  const router = useRouter();
  const recordEmberReview = useCallback(
    () => ember.recordReview(new Date().toISOString()),
    [ember],
  );
  if (mode === 'statistics')
    return (
      <StatisticsScreen
        repository={statistics}
        onReview={recordEmberReview}
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
      emberRepository={ember}
      onAddKind={(kind) => router.push({ pathname: '/movement', params: { kind } })}
      onAccounts={() => router.navigate('/accounts')}
      onMovements={() => router.navigate('/(tabs)/movements')}
      onEdit={(id) => router.push({ pathname: '/movement', params: { id } })}
    />
  );
}
