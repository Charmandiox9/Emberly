import { describe, expect, it } from 'vitest';
import type { EmberRepository } from '../../src/modules/ember/application/ember-repository';
import { SqliteFinanceRepository } from '../../src/modules/movements';
import { migrateDatabase } from '../../src/shared/storage/migrations';
import { readSummaryData } from '../../src/modules/dashboard/application/read-summary';
import { openTestDatabase } from '../helpers/node-database';

describe('resumen del panel', () => {
  it('mantiene los datos financieros disponibles si falla la lectura del progreso de Ember', async () => {
    const database = openTestDatabase();
    await migrateDatabase(database);
    const emberRepository: EmberRepository = {
      async readProgress() {
        throw new Error('La tabla de progreso no está disponible.');
      },
      async recordReview() {},
    };

    try {
      const summary = await readSummaryData(
        new SqliteFinanceRepository(database),
        emberRepository,
        '2026-10',
        true,
      );

      expect(summary.ember).toBeNull();
      expect(summary.recent.entries).toEqual([]);
      expect(summary.overview.balance.amountMinor).toBe(0);
    } finally {
      database.close();
    }
  });

  it('omite Ember fuera de Inicio', async () => {
    const database = openTestDatabase();
    await migrateDatabase(database);
    const emberRepository: EmberRepository = {
      async readProgress() {
        throw new Error('No debería consultarse en Estadísticas.');
      },
      async recordReview() {},
    };

    try {
      const summary = await readSummaryData(
        new SqliteFinanceRepository(database),
        emberRepository,
        '2026-10',
        false,
      );

      expect(summary.ember).toBeNull();
      expect(summary.recent.entries).toEqual([]);
    } finally {
      database.close();
    }
  });
});
