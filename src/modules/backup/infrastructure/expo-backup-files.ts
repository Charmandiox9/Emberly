import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { ExpoAttachmentFiles } from '../../attachments/native';
import type {
  BackupAttachment,
  BackupFileIdentity,
  BackupFilePort,
} from '../application/local-backup';

interface RestoreManifest {
  readonly version: 1;
  readonly previous: readonly BackupFileIdentity[];
  readonly next: readonly BackupFileIdentity[];
}

function manifestFile(): File {
  return new File(Paths.document, 'emberly-restore-manifest.json');
}

async function writeManifest(value: RestoreManifest): Promise<void> {
  const destination = manifestFile();
  if (destination.exists)
    throw new Error('Hay una restauración pendiente que debe recuperarse primero.');
  const temporary = new File(Paths.document, 'emberly-restore-manifest.json.tmp');
  if (temporary.exists) await temporary.delete();
  await temporary.create({ intermediates: true, overwrite: true });
  temporary.write(JSON.stringify(value));
  await temporary.move(destination);
}

function readManifest(): RestoreManifest | null {
  const file = manifestFile();
  if (!file.exists) return null;
  const parsed: unknown = JSON.parse(file.textSync());
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('No se pudo recuperar una restauración interrumpida.');
  const manifest = parsed as Record<string, unknown>;
  const version = manifest['version'];
  const previous: unknown = manifest['previous'];
  const next: unknown = manifest['next'];
  const valid = (items: unknown): items is readonly BackupFileIdentity[] =>
    Array.isArray(items) &&
    items.every(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>)['id'] === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String((item as Record<string, unknown>)['id']),
        ) &&
        typeof (item as Record<string, unknown>)['sha256'] === 'string' &&
        /^[a-f0-9]{64}$/.test(String((item as Record<string, unknown>)['sha256'])),
    );
  if (version !== 1 || !valid(previous) || !valid(next))
    throw new Error(
      'El registro de recuperación está dañado. Conserva el archivo y contacta soporte.',
    );
  return { version: 1, previous, next };
}

export class ExpoBackupFiles implements BackupFilePort {
  private readonly attachments = new ExpoAttachmentFiles();
  private manifest: RestoreManifest | null = null;

  readAttachment(id: string, expectedSha256: string): Promise<string> {
    return this.attachments.readBackupFile(id, expectedSha256);
  }

  async share(name: string, contents: string): Promise<void> {
    if (!(await isAvailableAsync()))
      throw new Error('No hay una aplicación para guardar el respaldo.');
    const directory = new Directory(Paths.cache, 'emberly-backups');
    directory.create({ intermediates: true, idempotent: true });
    const file = new File(directory, name);
    if (file.exists) file.delete();
    file.create({ intermediates: true, overwrite: true });
    file.write(contents);
    await shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar respaldo de Emberly',
      UTI: 'public.json',
    });
  }

  async readImport(uri: string): Promise<string> {
    const file = new File(uri);
    if (!file.exists || file.size < 1 || file.size > 200 * 1024 * 1024)
      throw new Error('El archivo de respaldo está vacío o supera los 200 MB.');
    return file.text();
  }

  async stageAttachment(attachment: BackupAttachment): Promise<void> {
    await this.attachments.verifyBackupRestoreFile(
      attachment.id,
      attachment.data,
      attachment.sha256,
    );
  }

  async replaceAttachments(
    previous: readonly BackupFileIdentity[],
    next: readonly BackupAttachment[],
  ): Promise<void> {
    for (const old of previous) {
      const actual = await this.attachments.inspect(old.id);
      if (!actual || actual.sha256 !== old.sha256)
        throw new Error('Un comprobante actual cambió; la restauración se canceló.');
    }
    this.manifest = {
      version: 1,
      previous,
      next: next.map(({ id, sha256 }) => ({ id, sha256 })),
    };
    await writeManifest(this.manifest);
    try {
      for (const old of previous) await this.attachments.moveBackupRestoreFileToRollback(old.id);
      for (const item of next) await this.attachments.moveStagedBackupRestoreFile(item.id);
    } catch (error: unknown) {
      await this.rollbackAttachments();
      throw error;
    }
  }

  async rollbackAttachments(): Promise<void> {
    const manifest = this.manifest ?? readManifest();
    if (!manifest) return;
    const previousIds = new Set(manifest.previous.map((item) => item.id));
    for (const old of manifest.previous) await this.attachments.restoreBackupRollbackFile(old.id);
    for (const next of manifest.next) {
      if (!previousIds.has(next.id)) await this.attachments.removeStoredAttachment(next.id);
      await this.attachments.removeBackupRestoreFiles(next.id);
    }
    for (const old of manifest.previous) await this.attachments.removeBackupRestoreFiles(old.id);
    const file = manifestFile();
    if (file.exists) await file.delete();
    const temporary = new File(Paths.document, 'emberly-restore-manifest.json.tmp');
    if (temporary.exists) await temporary.delete();
    this.manifest = null;
  }

  async finishAttachments(): Promise<void> {
    const manifest = this.manifest ?? readManifest();
    if (!manifest) return;
    const nextIds = new Set(manifest.next.map((item) => item.id));
    for (const old of manifest.previous)
      if (!nextIds.has(old.id)) await this.attachments.removeStoredAttachment(old.id);
    for (const item of [...manifest.previous, ...manifest.next])
      await this.attachments.removeBackupRestoreFiles(item.id);
    const file = manifestFile();
    if (file.exists) await file.delete();
    const temporary = new File(Paths.document, 'emberly-restore-manifest.json.tmp');
    if (temporary.exists) await temporary.delete();
    this.manifest = null;
  }

  async recoverAttachments(current: readonly BackupFileIdentity[]): Promise<void> {
    this.manifest = readManifest();
    if (!this.manifest) return;
    const currentMap = new Map(current.map((item) => [item.id, item.sha256]));
    const committed =
      currentMap.size === this.manifest.next.length &&
      this.manifest.next.every((item) => currentMap.get(item.id) === item.sha256);
    if (!committed) {
      await this.rollbackAttachments();
      return;
    }
    for (const next of this.manifest.next) {
      const actual = await this.attachments.inspect(next.id);
      if (actual?.sha256 === next.sha256) continue;
      if (!(await this.attachments.verifyStagedBackupRestoreFile(next.id, next.sha256)))
        throw new Error('La restauración se interrumpió y falta un comprobante preparado.');
      if (!this.manifest.previous.some((item) => item.id === next.id))
        await this.attachments.moveBackupRestoreFileToRollback(next.id);
      await this.attachments.moveStagedBackupRestoreFile(next.id);
    }
    await this.finishAttachments();
  }
}
