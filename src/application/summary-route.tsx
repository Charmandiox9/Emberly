import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { SummaryScreen } from '../modules/dashboard/presentation/summary-screen';
import { useServices } from './services';

interface SummaryRouteProps {
  readonly mode: 'home' | 'statistics';
}
export function SummaryRoute({ mode }: SummaryRouteProps): ReactElement {
  const { finance } = useServices();
  const router = useRouter();
  return (
    <SummaryScreen
      mode={mode}
      repository={finance}
      onAdd={() => router.push('/movement')}
      onAccounts={() => router.push('/accounts')}
      onEdit={(id) => router.push({ pathname: '/movement', params: { id } })}
    />
  );
}
