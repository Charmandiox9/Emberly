import type { Category } from '../../movements';

export interface ManagedCategory extends Category {
  readonly archived: boolean;
}

export function createCategory(input: Category): Category {
  if (!input.id.trim() || input.id.length > 128) throw new Error('Identificador inválido.');
  const name = categoryName(input.name);
  if (input.kind !== 'income' && input.kind !== 'expense')
    throw new Error('Selecciona ingreso o gasto.');
  return Object.freeze({ id: input.id, name, kind: input.kind });
}

export function categoryName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 60) throw new Error('Escribe un nombre de entre 1 y 60 caracteres.');
  return name;
}
