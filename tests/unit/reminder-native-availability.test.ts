import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpoReminderDevice } from '../../src/modules/reminders/infrastructure/expo-reminder-device';
import { ReminderService, SqliteReminderRepository } from '../../src/modules/reminders';
import { migrateDatabase } from '../../src/shared/storage/migrations';
import { openTestDatabase } from '../helpers/node-database';

const runtime = vi.hoisted(() => ({ imports: 0, missing: 'ExpoTopicSubscriptionModule' }));
vi.mock('expo', () => ({
  requireOptionalNativeModule: (name: string): unknown => (name === runtime.missing ? null : {}),
}));
vi.mock('expo-notifications', () => {
  runtime.imports++;
  if (runtime.missing) throw new Error(`Cannot find native module '${runtime.missing}'`);
  return { getAllScheduledNotificationsAsync: async () => [] };
});

describe('recordatorios en Expo Go sin ExpoTopicSubscriptionModule', () => {
  beforeEach(() => {
    runtime.imports = 0;
    runtime.missing = 'ExpoTopicSubscriptionModule';
  });
  it.each(['ExpoTopicSubscriptionModule', 'NotificationsServerRegistrationModule'])(
    'rechaza antes de evaluar la entrada nativa si falta %s',
    async (missing) => {
      runtime.missing = missing;
      const device = new ExpoReminderDevice();
      await expect(device.list()).rejects.toThrow('development-build-required');
      expect(runtime.imports).toBe(0);
    },
  );
  it('protege todas las vías que cargan la librería, también el observador de apertura', async () => {
    const device = new ExpoReminderDevice();
    await expect(device.observe(() => true)).rejects.toThrow('development-build-required');
    await expect(device.channelEnabled()).rejects.toThrow('development-build-required');
    await expect(device.permission(true)).rejects.toThrow('development-build-required');
    await expect(device.schedule({ hour: 20, minute: 0 })).rejects.toThrow(
      'development-build-required',
    );
    await expect(device.cancel('emberly.reminder.daily-review.v1')).rejects.toThrow(
      'development-build-required',
    );
    expect(runtime.imports).toBe(0);
  });
  it('expone un estado recuperable sin cambiar los datos financieros ni borrar preferencias', async () => {
    const database = openTestDatabase();
    try {
      await migrateDatabase(database);
      const service = new ReminderService(
        new SqliteReminderRepository(database),
        new ExpoReminderDevice(),
      );
      expect((await service.read()).status).toBe('development-build-required');
      const state = await service.save({ enabled: true, hour: 9, minute: 15 });
      expect(state.status).toBe('development-build-required');
      expect(state.settings.enabled).toBe(true);
      expect(state.settings.hour).toBe(9);
      expect(runtime.imports).toBe(0);
    } finally {
      database.close();
    }
  });
  it('permite usar el adaptador cuando el cliente sí incluye todos los módulos', async () => {
    runtime.missing = '';
    expect(await new ExpoReminderDevice().list()).toEqual([]);
    expect(runtime.imports).toBe(1);
  });
});
