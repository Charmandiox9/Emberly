import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { MovementScreen } from '../modules/movements/presentation/movement-screen';
export default function Movement(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, categories, finance, attachments, attachmentPicker, movementCommitter } =
    useServices();
  const router = useRouter();
  return (
    <MovementScreen
      repository={finance}
      accounts={accounts}
      categories={categories}
      attachments={attachments}
      attachmentPicker={attachmentPicker}
      committer={movementCommitter}
      id={typeof id === 'string' ? id : undefined}
      onDone={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }}
      onAccounts={() => router.push('/accounts')}
      onCategories={() => router.push('/categories')}
    />
  );
}
