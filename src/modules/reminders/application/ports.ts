import type { ReminderPreferences, ReminderSettings, ReminderTime } from '../domain/reminder';

export interface ReminderRepository {
  read(): Promise<ReminderSettings>;
  save(input: ReminderPreferences): Promise<ReminderSettings>;
}
export interface ReminderPermission {
  readonly granted: boolean;
  readonly canAskAgain: boolean;
}
export interface ScheduledReminder {
  readonly id: string;
  readonly hour: number | null;
  readonly minute: number | null;
  readonly currentContent: boolean;
}
export interface ReminderDevice {
  list(): Promise<readonly ScheduledReminder[]>;
  cancel(id: string): Promise<void>;
  channelEnabled(): Promise<boolean>;
  permission(request: boolean): Promise<ReminderPermission>;
  schedule(time: ReminderTime): Promise<void>;
  observe(onOpen: () => boolean): Promise<() => void>;
}
