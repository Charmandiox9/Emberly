import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { MovementScreen } from '../modules/movements/presentation/movement-screen';
export default function Movement(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, finance } = useServices();
  const router = useRouter();
  return (
    <MovementScreen
      repository={finance}
      accounts={accounts}
      id={typeof id === 'string' ? id : undefined}
      onDone={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }}
      onAccounts={() => router.push('/accounts')}
    />
  );
}
