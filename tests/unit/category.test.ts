import { describe, expect, it } from 'vitest';
import { createCategory, categoryName } from '../../src/modules/categories';

describe('categorías', () => {
  it('normaliza el nombre y conserva identidad y tipo', () => {
    expect(createCategory({ id: 'pets', name: '  Mascotas  ', kind: 'expense' })).toEqual({
      id: 'pets',
      name: 'Mascotas',
      kind: 'expense',
    });
    expect(categoryName('Árbol'.repeat(12))).toHaveLength(60);
  });

  it('rechaza nombres vacíos, largos e identificadores inválidos', () => {
    for (const name of ['', '   ', 'a'.repeat(61)]) expect(() => categoryName(name)).toThrow();
    for (const id of ['', ' ', 'a'.repeat(129)])
      expect(() => createCategory({ id, name: 'Mascotas', kind: 'expense' })).toThrow();
  });
});
