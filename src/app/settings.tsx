import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { RemindersScreen } from '../modules/reminders/presentation/reminders-screen';

export default function Settings(): ReactElement {
  const { reminders } = useServices();
  return <RemindersScreen service={reminders} />;
}
