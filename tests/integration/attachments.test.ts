import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveMovementWithProofs } from '../../src/application/save-movement-with-proofs';
import { SqliteMovementCommitter } from '../../src/application/movement-committer';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import {
  AttachmentService,
  SqliteAttachmentRepository,
  type Attachment,
  type AttachmentIdentity,
  type AttachmentSource,
} from '../../src/modules/attachments';
import { SqliteFinanceRepository, type Movement } from '../../src/modules/movements';
import { createMoney } from '../../src/shared/domain/money';
import { migrateDatabase, migrations } from '../../src/shared/storage/migrations';
import { NodeAttachmentFiles } from '../helpers/node-attachment-files';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const expense: Movement = {
  id: 'expense',
  accountId: 'cash',
  categoryId: 'food',
  kind: 'expense',
  amount: createMoney(3000),
  description: 'Comida',
  date: '2026-10-20',
  createdAt,
};

describe('comprobantes con SQLite y archivos reales', () => {
  let directory: string;
  let database: TestDatabase;
  let repository: SqliteAttachmentRepository;
  let finance: SqliteFinanceRepository;
  let files: NodeAttachmentFiles;
  let service: AttachmentService;
  let identity: AttachmentIdentity;
  let committer: SqliteMovementCommitter;
  let source: AttachmentSource;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'emberly-attachments-'));
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    await new SqliteAccountRepository(database).save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    finance = new SqliteFinanceRepository(database);
    await finance.save(expense);
    repository = new SqliteAttachmentRepository(database);
    files = new NodeAttachmentFiles(directory);
    let next = 0;
    identity = {
      nextId: () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`,
      now: () => createdAt,
    };
    service = new AttachmentService(repository, files, identity);
    committer = new SqliteMovementCommitter(database, identity);
    const sourcePath = join(directory, 'receipt.pdf');
    await writeFile(sourcePath, '%PDF-1.7\nDocumento de prueba');
    source = { uri: pathToFileURL(sourcePath).href, name: 'Recibo.pdf' };
  });
  afterEach(() => {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-attachments-')
    )
      throw new Error('Limpieza fuera del directorio temporal de la prueba.');
    rmSync(directory, { recursive: true, force: true });
  });

  async function firstAttachment(): Promise<Attachment> {
    const attachment = (await service.list('expense'))[0];
    if (!attachment) throw new Error('Expected attachment');
    return attachment;
  }

  it('copia y conserva el archivo después de borrar el origen y reabrir SQLite', async () => {
    await service.add('expense', source);
    const attachment = await firstAttachment();
    expect(attachment.state).toBe('ready');
    expect(attachment.sourceUri).toBeNull();
    expect(attachment.file?.mimeType).toBe('application/pdf');
    expect(attachment.file?.sha256).toMatch(/^[a-f0-9]{64}$/);
    rmSync(join(directory, 'receipt.pdf'));
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    service = new AttachmentService(new SqliteAttachmentRepository(database), files, identity);
    await service.recover();
    expect(await firstAttachment()).toEqual(attachment);
    expect(await files.inspect(attachment.id)).toEqual(attachment.file);
    expect(
      (await new SqliteFinanceRepository(database).overview('2026-10')).balance.amountMinor,
    ).toBe(7000);
  });

  it('un fallo de disco conserva el movimiento y permite reintentar el mismo comprobante', async () => {
    files.failCopy = true;
    await expect(service.add('expense', source)).rejects.toThrow();
    const failed = await firstAttachment();
    expect(failed.state).toBe('failed');
    expect(await database.all('SELECT * FROM attachment_outbox')).toEqual([]);
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(7000);
    files.failCopy = false;
    await service.retry(failed);
    expect((await firstAttachment()).id).toBe(failed.id);
    expect((await firstAttachment()).state).toBe('ready');
    expect(await database.all('SELECT * FROM attachment_outbox')).toHaveLength(1);
    await service.retry(failed);
    expect(await database.all('SELECT * FROM attachment_outbox')).toHaveLength(1);
  });

  it('recupera una copia final que quedó sin confirmación SQL', async () => {
    files.interruptAfterCopy = true;
    await expect(service.add('expense', source)).rejects.toThrow();
    expect((await firstAttachment()).state).toBe('failed');
    await new AttachmentService(repository, files, identity).recover();
    expect((await firstAttachment()).state).toBe('ready');
    expect(await database.all('SELECT * FROM attachment_outbox')).toHaveLength(1);
    await service.recover();
    expect(await database.all('SELECT * FROM attachment_outbox')).toHaveLength(1);
  });

  it('no anuncia como guardada una preparación interrumpida sin archivo final', async () => {
    await repository.prepare({
      id: identity.nextId(),
      movementId: 'expense',
      name: 'Pendiente',
      sourceUri: source.uri,
      state: 'preparing',
      file: null,
      createdAt,
    });
    await service.recover();
    expect((await firstAttachment()).state).toBe('failed');
    expect(await database.all('SELECT * FROM attachment_outbox')).toEqual([]);
  });

  it('elimina un movimiento y conserva la limpieza pendiente aunque el disco falle', async () => {
    await service.add('expense', source);
    const attachment = await firstAttachment();
    files.failCleanup = true;
    await finance.remove('expense');
    await service.recover();
    expect(await service.list('expense')).toEqual([]);
    expect(await repository.cleanupIds()).toEqual([attachment.id]);
    expect(await files.inspect(attachment.id)).not.toBeNull();
    expect(
      (await database.all('SELECT action FROM attachment_outbox ORDER BY sequence')).map(
        (row) => row['action'],
      ),
    ).toEqual(['upsert', 'delete']);
    files.failCleanup = false;
    await service.recover();
    expect(await repository.cleanupIds()).toEqual([]);
    expect(await files.inspect(attachment.id)).toBeNull();
  });

  it('quitar un comprobante no modifica el saldo ni el movimiento', async () => {
    await service.add('expense', source);
    const attachment = await firstAttachment();
    await service.remove(attachment.id);
    expect(await files.inspect(attachment.id)).toBeNull();
    expect(await firstAttachment().catch(() => null)).toBeNull();
    expect((await finance.get('expense'))?.description).toBe('Comida');
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(7000);
  });

  it('revierte la eliminación financiera si no puede conservar la eliminación del comprobante', async () => {
    await service.add('expense', source);
    const before = await firstAttachment();
    await database.exec(`CREATE TRIGGER block_attachment_delete BEFORE INSERT ON attachment_outbox
      WHEN NEW.action = 'delete' BEGIN SELECT RAISE(ABORT, 'outbox unavailable'); END;`);
    await expect(finance.remove('expense')).rejects.toThrow('outbox unavailable');
    expect(await firstAttachment()).toEqual(before);
    expect(await files.inspect(before.id)).not.toBeNull();
    expect(await repository.cleanupIds()).toEqual([]);
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(7000);
  });

  it('recupera una copia cuando la escritura de metadatos/cola falló', async () => {
    await database.exec(`CREATE TRIGGER block_attachment_ready BEFORE INSERT ON attachment_outbox
      WHEN NEW.action = 'upsert' BEGIN SELECT RAISE(ABORT, 'outbox unavailable'); END;`);
    await expect(service.add('expense', source)).rejects.toThrow('outbox unavailable');
    expect((await firstAttachment()).state).toBe('failed');
    expect(await database.all('SELECT * FROM attachment_outbox')).toEqual([]);
    await database.exec('DROP TRIGGER block_attachment_ready');
    await service.recover();
    expect((await firstAttachment()).state).toBe('ready');
    expect(await database.all('SELECT * FROM attachment_outbox')).toHaveLength(1);
  });

  it('limita a cinco comprobantes incluso ante solicitudes simultáneas', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => service.add('expense', source)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5);
    expect(await service.list('expense')).toHaveLength(5);
  });

  it('rechaza archivos disfrazados de PDF, conservando un fallo recuperable', async () => {
    await writeFile(join(directory, 'receipt.pdf'), 'Esto no es un PDF');
    await expect(service.add('expense', source)).rejects.toThrow();
    expect((await firstAttachment()).state).toBe('failed');
    expect(await database.all('SELECT * FROM attachment_outbox')).toEqual([]);
  });

  it('no copia archivos para un movimiento inexistente ni acepta rutas remotas', async () => {
    await expect(service.add('missing', source)).rejects.toThrow();
    await expect(
      service.add('expense', { ...source, uri: 'https://example.com/receipt.pdf' }),
    ).rejects.toThrow();
    expect(await service.list('expense')).toEqual([]);
    expect(await database.all('SELECT * FROM attachment_outbox')).toEqual([]);
  });

  it('guarda una operación financiera una sola vez aunque sus comprobantes fallen', async () => {
    files.failCopy = true;
    const newMovement = { ...expense, id: 'another' };
    const result = await saveMovementWithProofs(committer, service, {
      movement: newMovement,
      today: '2026-10-20',
      updating: false,
      selected: [source],
    });
    expect(result.proofStatus).toBe('incomplete');
    expect(result.attachments[0]?.state).toBe('failed');
    const retry = await saveMovementWithProofs(committer, service, {
      movement: newMovement,
      today: '2026-10-20',
      updating: true,
      selected: [],
    });
    expect(retry.proofStatus).toBe('saved');
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(4000);
    expect((await finance.list({ month: '2026-10' })).entries).toHaveLength(2);
  });

  it('distingue un fallo al consultar adjuntos de un fallo financiero previo', async () => {
    const writer = {
      retry: () => Promise.resolve(),
      list: async (): Promise<readonly Attachment[]> => {
        throw new Error('read failed');
      },
    };
    const result = await saveMovementWithProofs(committer, writer, {
      movement: { ...expense, id: 'saved' },
      today: '2026-10-20',
      updating: false,
      selected: [],
    });
    expect(result.proofStatus).toBe('unavailable');
    expect(await finance.get('saved')).not.toBeNull();
    let attempted = false;
    await expect(
      saveMovementWithProofs(
        committer,
        {
          ...writer,
          retry: () => {
            attempted = true;
            return Promise.resolve();
          },
        },
        {
          movement: { ...expense, id: 'invalid', categoryId: 'salary' },
          today: '2026-10-20',
          updating: false,
          selected: [source],
        },
      ),
    ).rejects.toThrow();
    expect(attempted).toBe(false);
    expect(await finance.get('invalid')).toBeNull();
  });

  it('migra desde esquema 3 sin perder cuentas, movimientos ni operaciones pendientes', async () => {
    const legacy = openTestDatabase();
    try {
      for (const migration of migrations.filter((entry) => entry.version <= 3))
        await legacy.exec(migration.sql);
      await legacy.exec('PRAGMA user_version = 3');
      await new SqliteAccountRepository(legacy).save({
        id: 'cash',
        name: 'Efectivo',
        initialBalance: createMoney(10000),
        createdAt,
      });
      const pending = await legacy.all('SELECT * FROM sync_outbox ORDER BY sequence');
      await migrateDatabase(legacy);
      expect(await legacy.all('SELECT * FROM sync_outbox ORDER BY sequence')).toEqual(pending);
      expect(await new SqliteAttachmentRepository(legacy).list('expense')).toEqual([]);
      expect(
        (await new SqliteAccountRepository(legacy).list())[0]?.initialBalance.amountMinor,
      ).toBe(10000);
    } finally {
      legacy.close();
    }
  });

  it('persiste los intentos de copia junto al movimiento antes de tocar archivos', async () => {
    const drafts = await committer.commit({
      movement: { ...expense, id: 'interrupted' },
      today: '2026-10-20',
      updating: false,
      selected: [source, source],
    });
    expect(drafts).toHaveLength(2);
    expect(await service.list('interrupted')).toHaveLength(2);
    await service.recover();
    const recovered = await service.list('interrupted');
    expect(recovered.every((entry) => entry.state === 'failed')).toBe(true);
    expect(await finance.get('interrupted')).not.toBeNull();
    const first = recovered[0];
    if (!first) throw new Error('Expected prepared attachment');
    await service.retry(first);
    expect((await service.list('interrupted'))[0]?.state).toBe('ready');
  });

  it('revierte todos los intentos y la escritura financiera si la preparación SQL falla', async () => {
    await expect(
      committer.commit({
        movement: { ...expense, id: 'too-many' },
        today: '2026-10-20',
        updating: false,
        selected: Array.from({ length: 6 }, () => source),
      }),
    ).rejects.toThrow();
    expect(await finance.get('too-many')).toBeNull();
    expect(await service.list('too-many')).toEqual([]);
    expect(await database.all("SELECT * FROM sync_outbox WHERE entity_id = 'too-many'")).toEqual(
      [],
    );
  });
});
