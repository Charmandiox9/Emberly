import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, type ReactElement } from 'react';

import { SqliteAccountRepository } from '../modules/accounts';
import { AccountsScreen } from '../modules/accounts/presentation/accounts-screen';
import { createExpoDatabase } from '../shared/storage/expo-database';

export default function Home(): ReactElement {
  const database = useSQLiteContext();
  const repository = useMemo(
    () => new SqliteAccountRepository(createExpoDatabase(database)),
    [database],
  );
  return <AccountsScreen repository={repository} />;
}
