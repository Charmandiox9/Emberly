import type { AttachmentFileInfo } from '../../attachments';
import type { GoalImage, GoalRepository } from './goal-repository';

export interface GoalImageFiles {
  copy(sourceUri: string, id: string): Promise<AttachmentFileInfo>;
  remove(id: string): Promise<void>;
  uri(id: string): string;
}

export class GoalImageService {
  constructor(
    private readonly repository: GoalRepository,
    private readonly files: GoalImageFiles,
    private readonly nextId: () => string,
  ) {}

  uri(id: string): string {
    return this.files.uri(id);
  }

  async replace(goalId: string, sourceUri: string): Promise<GoalImage> {
    const id = this.nextId();
    const file = await this.files.copy(sourceUri, id);
    if (file.mimeType === 'application/pdf') {
      await this.files.remove(id);
      throw new Error('La foto debe ser JPEG, PNG o WebP.');
    }
    const mimeType: GoalImage['mimeType'] = file.mimeType;
    const image: GoalImage = { id, ...file, mimeType };
    try {
      const previous = (await this.repository.overview()).goals.find((goal) => goal.id === goalId);
      if (!previous) throw new Error('La meta ya no existe.');
      await this.repository.setImage(goalId, image);
      if (previous.image) {
        try {
          await this.files.remove(previous.image.id);
        } catch {
          // Keep the new image referenced by SQLite; a stale old file can be cleaned later.
        }
      }
      return image;
    } catch (error: unknown) {
      await this.files.remove(id);
      throw error;
    }
  }

  async remove(goalId: string): Promise<void> {
    const previous = (await this.repository.overview()).goals.find((goal) => goal.id === goalId);
    if (!previous) throw new Error('La meta ya no existe.');
    await this.repository.setImage(goalId, null);
    if (previous.image) await this.files.remove(previous.image.id);
  }
}
