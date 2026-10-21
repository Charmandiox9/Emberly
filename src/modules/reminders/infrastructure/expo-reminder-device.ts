import type * as Notifications from 'expo-notifications';
import { requireOptionalNativeModule } from 'expo';
import type { ReminderDevice, ReminderPermission, ScheduledReminder } from '../application/ports';
import {
  reminderBody,
  reminderId,
  reminderPrefix,
  reminderTitle,
  reminderPreferences,
  ReminderBuildRequiredError,
  type ReminderTime,
} from '../domain/reminder';

const channelId = 'emberly-local-reminders-v1';
// SDK 57's public entry point eagerly loads these native modules, including remote-only APIs.
const requiredNativeModules: readonly string[] = [
  'ExpoTopicSubscriptionModule',
  'ExpoNotificationScheduler',
  'ExpoNotificationChannelManager',
  'ExpoNotificationChannelGroupManager',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationPresenter',
  'ExpoNotificationsEmitter',
  'ExpoNotificationsHandlerModule',
  'ExpoNotificationCategoriesModule',
  'ExpoBackgroundNotificationTasksModule',
  'ExpoBadgeModule',
  'ExpoPushTokenManager',
  'NotificationsServerRegistrationModule',
];
async function loadNotifications(): Promise<typeof Notifications> {
  if (requiredNativeModules.some((name) => requireOptionalNativeModule<unknown>(name) === null))
    throw new ReminderBuildRequiredError();
  return import('expo-notifications');
}
function dailyTime(trigger: unknown): ReminderTime | null {
  if (
    typeof trigger !== 'object' ||
    trigger === null ||
    !('type' in trigger) ||
    trigger.type !== 'daily' ||
    !('hour' in trigger) ||
    typeof trigger.hour !== 'number' ||
    !('minute' in trigger) ||
    typeof trigger.minute !== 'number'
  )
    return null;
  try {
    return reminderPreferences({ enabled: false, hour: trigger.hour, minute: trigger.minute });
  } catch {
    return null;
  }
}
function currentContent(
  request: Notifications.NotificationRequest,
  checkTimeZone = false,
): boolean {
  const data: unknown = request.content.data;
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Reflect.get(data, 'emberlyReminder') === 'daily-review' &&
    Reflect.get(data, 'version') === 1 &&
    (!checkTimeZone ||
      Reflect.get(data, 'timeZone') === Intl.DateTimeFormat().resolvedOptions().timeZone) &&
    request.content.title === reminderTitle &&
    request.content.body === reminderBody
  );
}
export class ExpoReminderDevice implements ReminderDevice {
  async list(): Promise<readonly ScheduledReminder[]> {
    const native = await loadNotifications();
    return (await native.getAllScheduledNotificationsAsync())
      .filter((request) => request.identifier.startsWith(reminderPrefix))
      .map((request) => {
        const time = dailyTime(request.trigger);
        return {
          id: request.identifier,
          hour: time?.hour ?? null,
          minute: time?.minute ?? null,
          currentContent: currentContent(request, true),
        };
      });
  }
  async cancel(id: string): Promise<void> {
    if (!id.startsWith(reminderPrefix)) throw new Error('Recordatorio ajeno.');
    await (await loadNotifications()).cancelScheduledNotificationAsync(id);
  }
  async channelEnabled(): Promise<boolean> {
    const native = await loadNotifications();
    let channel = await native.getNotificationChannelAsync(channelId);
    if (!channel)
      channel = await native.setNotificationChannelAsync(channelId, {
        name: 'Recordatorios de Emberly',
        description: 'Un aviso diario opcional para revisar tu día.',
        importance: native.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: native.AndroidNotificationVisibility.PRIVATE,
      });
    if (!channel) throw new Error('Canal no disponible.');
    return channel.importance !== native.AndroidImportance.NONE;
  }
  async permission(request: boolean): Promise<ReminderPermission> {
    const native = await loadNotifications();
    let permission = await native.getPermissionsAsync();
    if (request && !permission.granted && permission.canAskAgain)
      permission = await native.requestPermissionsAsync();
    return { granted: permission.granted, canAskAgain: permission.canAskAgain };
  }
  async schedule(time: ReminderTime): Promise<void> {
    const native = await loadNotifications();
    const id = await native.scheduleNotificationAsync({
      identifier: reminderId,
      content: {
        title: reminderTitle,
        body: reminderBody,
        sound: false,
        data: {
          emberlyReminder: 'daily-review',
          version: 1,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      trigger: {
        type: native.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId,
      },
    });
    if (id !== reminderId) throw new Error('No se confirmó la identidad del recordatorio.');
  }
  async observe(onOpen: () => boolean): Promise<() => void> {
    const native = await loadNotifications();
    native.setNotificationHandler({
      handleNotification: async (notification) => {
        const owned =
          notification.request.identifier.startsWith(reminderPrefix) &&
          currentContent(notification.request);
        return {
          shouldShowBanner: owned,
          shouldShowList: owned,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    const seen = new Set<string>();
    const respond = (response: Notifications.NotificationResponse): void => {
      const notification = response.notification;
      if (
        response.actionIdentifier !== native.DEFAULT_ACTION_IDENTIFIER ||
        !notification.request.identifier.startsWith(reminderPrefix) ||
        !currentContent(notification.request)
      )
        return;
      const key = `${notification.request.identifier}:${notification.date}`;
      if (seen.has(key) || !onOpen()) return;
      seen.add(key);
      native.clearLastNotificationResponse();
    };
    const subscription = native.addNotificationResponseReceivedListener(respond);
    try {
      const previous = native.getLastNotificationResponse();
      if (previous) respond(previous);
    } catch (error: unknown) {
      subscription.remove();
      throw error;
    }
    return () => subscription.remove();
  }
}
