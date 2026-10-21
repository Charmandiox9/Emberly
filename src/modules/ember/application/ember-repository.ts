import type { EmberProgress } from '../domain/ember-progress';

export interface EmberRepository {
  readProgress(): Promise<EmberProgress>;
  recordReview(recordedAt: string): Promise<void>;
}
