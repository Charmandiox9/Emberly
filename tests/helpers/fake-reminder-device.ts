import {
  reminderId,
  type ReminderDevice,
  type ReminderPermission,
  type ReminderTime,
  type ScheduledReminder,
} from '../../src/modules/reminders';

export class FakeReminderDevice implements ReminderDevice {
  readonly scheduled = new Map<string, ScheduledReminder>();
  readonly cancelled: string[] = [];
  permissionState: ReminderPermission = { granted: true, canAskAgain: true };
  allowOnRequest = false;
  channel = true;
  prompts = 0;
  permissionReads = 0;
  schedules = 0;
  failSchedule = false;
  failAfterSchedule = false;
  failCancel = false;
  failList = false;
  async list(): Promise<readonly ScheduledReminder[]> {
    if (this.failList) throw new Error('native unavailable');
    return [...this.scheduled.values()];
  }
  async cancel(id: string): Promise<void> {
    if (this.failCancel) throw new Error('cancel unavailable');
    this.cancelled.push(id);
    this.scheduled.delete(id);
  }
  async channelEnabled(): Promise<boolean> {
    return this.channel;
  }
  async permission(request: boolean): Promise<ReminderPermission> {
    this.permissionReads++;
    if (request && !this.permissionState.granted && this.permissionState.canAskAgain) {
      this.prompts++;
      if (this.allowOnRequest) this.permissionState = { granted: true, canAskAgain: true };
    }
    return this.permissionState;
  }
  async schedule(time: ReminderTime): Promise<void> {
    this.schedules++;
    if (this.failSchedule) throw new Error('schedule unavailable');
    this.scheduled.set(reminderId, {
      id: reminderId,
      hour: time.hour,
      minute: time.minute,
      currentContent: true,
    });
    if (this.failAfterSchedule) throw new Error('response lost');
  }
  async observe(_onOpen: () => boolean): Promise<() => void> {
    return () => undefined;
  }
}
