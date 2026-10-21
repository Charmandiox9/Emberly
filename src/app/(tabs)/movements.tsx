import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../../application/services';
import { HistoryScreen } from '../../modules/movements/presentation/history-screen';
import { historyFilters } from '../../modules/movements';
export default function Movements(): ReactElement {
  const { finance, accounts } = useServices();
  const router = useRouter();
  const params = useLocalSearchParams<{
    month?: string;
    kind?: string;
    categoryId?: string;
    filterRequestId?: string;
  }>();
  const filters = historyFilters(params);
  return (
    <HistoryScreen
      key={JSON.stringify([filters, params.filterRequestId])}
      initialFilters={filters}
      repository={finance}
      accounts={accounts}
      onAdd={() => router.push('/movement')}
      onTransfers={() => router.push('/transfers')}
      onCategories={() => router.push('/categories')}
      onEdit={(id) => router.push({ pathname: '/movement', params: { id } })}
    />
  );
}
