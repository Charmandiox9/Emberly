import {
  reminderId,
  reminderPreferences,
  reminderPrefix,
  ReminderBuildRequiredError,
  type ReminderPreferences,
  type ReminderSettings,
} from '../domain/reminder';
import type { ReminderDevice, ReminderRepository, ScheduledReminder } from './ports';

export interface ReminderState {
  readonly settings: ReminderSettings;
  readonly status:
    | 'disabled'
    | 'scheduled'
    | 'permission-required'
    | 'channel-blocked'
    | 'pending'
    | 'development-build-required';
  readonly canAskAgain: boolean;
}
export class ReminderService {
  private pending: Promise<void> = Promise.resolve();
  constructor(
    private readonly repository: ReminderRepository,
    private readonly device: ReminderDevice,
  ) {}

  read(): Promise<ReminderState> {
    return this.exclusive(() => this.reconcile(false));
  }
  async save(input: ReminderPreferences): Promise<ReminderState> {
    const preferences = reminderPreferences(input);
    return this.exclusive(async () => {
      await this.repository.save(preferences);
      return this.reconcile(preferences.enabled);
    });
  }
  observe(onOpen: () => boolean): Promise<() => void> {
    return this.device.observe(onOpen);
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.pending.then(work);
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private async reconcile(request: boolean): Promise<ReminderState> {
    const settings = await this.repository.read();
    try {
      const scheduled = (await this.device.list()).filter((item) =>
        item.id.startsWith(reminderPrefix),
      );
      const cancel = async (entries: readonly ScheduledReminder[]): Promise<void> => {
        for (const item of entries) await this.device.cancel(item.id);
      };
      if (!settings.enabled) {
        await cancel(scheduled);
        return { settings, status: 'disabled', canAskAgain: false };
      }
      const channelEnabled = await this.device.channelEnabled();
      const permission = await this.device.permission(request);
      if (!permission.granted || !channelEnabled) {
        await cancel(scheduled);
        return {
          settings,
          status: !permission.granted ? 'permission-required' : 'channel-blocked',
          canAskAgain: permission.canAskAgain,
        };
      }
      const matches = (item: ScheduledReminder): boolean =>
        item.id === reminderId &&
        item.currentContent &&
        item.hour === settings.hour &&
        item.minute === settings.minute;
      await cancel(scheduled.filter((item) => !matches(item)));
      if (!scheduled.some(matches)) await this.device.schedule(settings);
      const confirmed = (await this.device.list()).filter((item) =>
        item.id.startsWith(reminderPrefix),
      );
      if (confirmed.length !== 1 || !confirmed.every(matches))
        throw new Error('Scheduling not confirmed');
      return { settings, status: 'scheduled', canAskAgain: permission.canAskAgain };
    } catch (error: unknown) {
      return {
        settings,
        status:
          error instanceof ReminderBuildRequiredError ? 'development-build-required' : 'pending',
        canAskAgain: false,
      };
    }
  }
}
