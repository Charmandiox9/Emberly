import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { RemindersScreen } from '../modules/reminders/presentation/reminders-screen';
import { BackupSection } from '../modules/backup/presentation/backup-section';

export default function Settings(): ReactElement {
  const { reminders, backup } = useServices();
  return (
    <RemindersScreen service={reminders}>
      <BackupSection service={backup} />
    </RemindersScreen>
  );
}
