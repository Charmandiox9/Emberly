import type { Category } from '../../movements';
import type { ManagedCategory } from '../domain/category';

export interface CategoryRepository {
  list(): Promise<readonly ManagedCategory[]>;
  save(category: Category): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}
