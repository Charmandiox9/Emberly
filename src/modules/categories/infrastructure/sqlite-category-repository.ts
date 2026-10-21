import type { Database, SqlValue } from '../../../shared/storage/database';
import type { Category } from '../../movements';
import type { CategoryRepository } from '../application/category-repository';
import { categoryName, createCategory, type ManagedCategory } from '../domain/category';

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<readonly ManagedCategory[]> {
    const rows = await this.database.all(
      'SELECT id, name, kind, archived FROM categories ORDER BY archived, name, id',
    );
    return rows.map((row) => {
      const { id, name, kind, archived } = row;
      if (
        typeof id !== 'string' ||
        typeof name !== 'string' ||
        (kind !== 'income' && kind !== 'expense') ||
        (archived !== 0 && archived !== 1)
      )
        throw new Error('La categoría guardada no es válida.');
      return { ...createCategory({ id, name, kind }), archived: archived === 1 };
    });
  }

  async save(input: Category): Promise<void> {
    const category = createCategory(input);
    await this.database.run('INSERT INTO categories (id, name, kind) VALUES (?, ?, ?)', [
      category.id,
      category.name,
      category.kind,
    ]);
  }

  async rename(id: string, name: string): Promise<void> {
    await this.update(id, 'name', categoryName(name));
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    if (typeof archived !== 'boolean') throw new Error('Estado de categoría inválido.');
    await this.update(id, 'archived', archived ? 1 : 0);
  }

  private async update(id: string, column: 'name' | 'archived', value: SqlValue): Promise<void> {
    await this.database.transaction(async (transaction) => {
      if (!(await transaction.first('SELECT id FROM categories WHERE id = ?', [id])))
        throw new Error('La categoría ya no existe.');
      await transaction.run(`UPDATE categories SET ${column} = ? WHERE id = ?`, [value, id]);
    });
  }
}
