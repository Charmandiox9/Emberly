import { describe, expect, it } from 'vitest';
import { createEmberProgress, emberStage } from '../../src/modules/ember/domain/ember-progress';

describe('progresión de Ember', () => {
  it.each([
    [0, 'chispa'],
    [2, 'chispa'],
    [3, 'ember'],
    [9, 'ember'],
    [10, 'flarely'],
  ] as const)('deriva la etapa al completar %i días', (days, stage) => {
    expect(emberStage(days)).toBe(stage);
  });

  it('calcula el avance a la siguiente etapa sin crear rachas', () => {
    expect(createEmberProgress(2, []).daysToNextStage).toBe(1);
    expect(createEmberProgress(3, []).daysToNextStage).toBe(7);
    expect(createEmberProgress(10, []).nextStageAt).toBeNull();
  });

  it('rechaza un conteo de días inválido', () => {
    expect(() => emberStage(-1)).toThrow('La cantidad de días activos no es válida.');
    expect(() => emberStage(1.5)).toThrow('La cantidad de días activos no es válida.');
  });
});
