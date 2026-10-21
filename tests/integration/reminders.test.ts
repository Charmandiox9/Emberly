import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ReminderService,
  SqliteReminderRepository,
  reminderId,
  reminderPrefix,
} from '../../src/modules/reminders';
import { SqliteSyncQueue } from '../../src/modules/sync';
import {
  migrateDatabase,
  migrations,
  readSchemaVersion,
  schemaVersion,
} from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';
import { FakeReminderDevice } from '../helpers/fake-reminder-device';

const preferences = { enabled: true, hour: 20, minute: 0 };
describe('recordatorios con SQLite real y adaptador nativo sustituido', () => {
  let database: TestDatabase;
  let repository: SqliteReminderRepository;
  let device: FakeReminderDevice;
  let service: ReminderService;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    repository = new SqliteReminderRepository(database);
    device = new FakeReminderDevice();
    service = new ReminderService(repository, device);
  });
  afterEach(() => database.close());

  it('comienza desactivado y no pide permisos ni modifica la cola financiera', async () => {
    const queue = new SqliteSyncQueue(database);
    const before = await queue.listPending();
    expect((await service.read()).status).toBe('disabled');
    expect((await repository.read()).revision).toBe(1);
    expect(device.permissionReads).toBe(0);
    expect(device.prompts).toBe(0);
    expect(device.schedules).toBe(0);
    expect(await queue.listPending()).toEqual(before);
  });
  it('activa una sola programación y los reintentos no duplican ni incrementan revisiones sin cambios', async () => {
    expect((await service.save(preferences)).status).toBe('scheduled');
    await service.read();
    await service.save(preferences);
    await service.read();
    expect(device.scheduled.size).toBe(1);
    expect(device.schedules).toBe(1);
    expect((await repository.read()).revision).toBe(2);
  });
  it('solo pide permiso por acción explícita y recupera concesión o revocación sin preguntar al inicio', async () => {
    device.permissionState = { granted: false, canAskAgain: true };
    await repository.save(preferences);
    expect((await service.read()).status).toBe('permission-required');
    expect(device.prompts).toBe(0);
    device.allowOnRequest = true;
    expect((await service.save(preferences)).status).toBe('scheduled');
    expect(device.prompts).toBe(1);
    device.permissionState = { granted: false, canAskAgain: false };
    expect((await service.read()).status).toBe('permission-required');
    expect(device.scheduled.size).toBe(0);
    await service.save(preferences);
    expect(device.prompts).toBe(1);
    device.permissionState = { granted: true, canAskAgain: true };
    expect((await service.read()).status).toBe('scheduled');
    expect(device.scheduled.size).toBe(1);
  });
  it('respeta canal bloqueado y conserva la preferencia para reintentar tras habilitarlo en Android', async () => {
    await service.save(preferences);
    device.channel = false;
    expect((await service.read()).status).toBe('channel-blocked');
    expect(device.scheduled.size).toBe(0);
    expect((await repository.read()).enabled).toBe(true);
    device.channel = true;
    expect((await service.read()).status).toBe('scheduled');
  });
  it('cambia horario y limpia solo duplicados propios, conservando otros avisos', async () => {
    await service.save(preferences);
    device.scheduled.set(`${reminderPrefix}old`, {
      id: `${reminderPrefix}old`,
      hour: 19,
      minute: 0,
      currentContent: false,
    });
    device.scheduled.set('other-feature', {
      id: 'other-feature',
      hour: 10,
      minute: 0,
      currentContent: false,
    });
    expect((await service.save({ ...preferences, hour: 8, minute: 30 })).status).toBe('scheduled');
    expect(device.scheduled.size).toBe(2);
    expect(device.scheduled.get(reminderId)?.hour).toBe(8);
    expect(device.scheduled.has('other-feature')).toBe(true);
    expect(device.cancelled).not.toContain('other-feature');
  });
  it('reemplaza programación con contenido o zona obsoletos aunque conserve el horario', async () => {
    await service.save(preferences);
    device.scheduled.set(reminderId, {
      id: reminderId,
      hour: 20,
      minute: 0,
      currentContent: false,
    });
    expect((await service.read()).status).toBe('scheduled');
    expect(device.schedules).toBe(2);
    expect(device.scheduled.get(reminderId)?.currentContent).toBe(true);
  });
  it('conserva intención si falla programar y la recupera desde otra instancia al reabrir', async () => {
    device.failSchedule = true;
    expect((await service.save(preferences)).status).toBe('pending');
    expect((await repository.read()).enabled).toBe(true);
    device.failSchedule = false;
    const restarted = new ReminderService(new SqliteReminderRepository(database), device);
    expect((await restarted.read()).status).toBe('scheduled');
    expect(device.scheduled.size).toBe(1);
  });
  it('recupera una respuesta perdida después de programar sin crear otra notificación', async () => {
    device.failAfterSchedule = true;
    expect((await service.save(preferences)).status).toBe('pending');
    device.failAfterSchedule = false;
    expect((await service.read()).status).toBe('scheduled');
    expect(device.schedules).toBe(1);
  });
  it('persiste la desactivación aunque falle cancelar y no informa éxito hasta recuperarse', async () => {
    await service.save(preferences);
    device.failCancel = true;
    expect((await service.save({ ...preferences, enabled: false })).status).toBe('pending');
    expect((await repository.read()).enabled).toBe(false);
    expect(device.scheduled.size).toBe(1);
    device.failCancel = false;
    expect((await service.read()).status).toBe('disabled');
    expect(device.scheduled.size).toBe(0);
  });
  it('no toca el dispositivo si falla el guardado SQLite y conserva las preferencias previas', async () => {
    await database.exec(
      `CREATE TRIGGER fail_reminder_preferences BEFORE UPDATE ON reminder_settings BEGIN SELECT RAISE(ABORT, 'storage unavailable'); END;`,
    );
    await expect(service.save(preferences)).rejects.toThrow('storage unavailable');
    expect((await repository.read()).enabled).toBe(false);
    expect(device.schedules).toBe(0);
    expect(device.permissionReads).toBe(0);
  });
  it('serializa cambios simultáneos con reconciliaciones para conservar la última intención', async () => {
    await Promise.all([
      service.save(preferences),
      service.read(),
      service.save({ ...preferences, hour: 9 }),
      service.save({ ...preferences, enabled: false }),
    ]);
    expect((await repository.read()).enabled).toBe(false);
    expect((await repository.read()).hour).toBe(20);
    expect((await repository.read()).revision).toBe(4);
    expect(device.scheduled.size).toBe(0);
  });
  it('reporta pendiente si falta el módulo nativo y mantiene recuperable el perfil local', async () => {
    device.failList = true;
    expect((await service.save(preferences)).status).toBe('pending');
    expect((await repository.read()).enabled).toBe(true);
    device.failList = false;
    expect((await service.read()).status).toBe('scheduled');
  });
});

it('migra desde esquema 8 sin tocar datos/colas y conserva preferencia tras cerrar el archivo', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-reminders-'));
  let database = openTestDatabase(join(directory, 'test.db'));
  try {
    for (const migration of migrations.filter((entry) => entry.version <= 8))
      await database.exec(migration.sql);
    await database.exec('PRAGMA user_version = 8');
    const previous = await new SqliteSyncQueue(database).listPending();
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(previous);
    const repository = new SqliteReminderRepository(database);
    await repository.save({ enabled: true, hour: 23, minute: 59 });
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    const device = new FakeReminderDevice();
    const result = await new ReminderService(new SqliteReminderRepository(database), device).read();
    expect(result.status).toBe('scheduled');
    expect(result.settings.hour).toBe(23);
    expect(result.settings.minute).toBe(59);
    expect(device.prompts).toBe(0);
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-reminders-')
    )
      throw new Error('Limpieza fuera del directorio temporal de prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});
