export type EmberStage = 'chispa' | 'ember' | 'flarely';
export type EmberAchievementId =
  'first-record' | 'first-plan' | 'first-review' | 'three-active-days' | 'ten-active-days';

export interface EarnedEmberAchievement {
  readonly id: EmberAchievementId;
  readonly earnedAt: string;
}

export interface EmberProgress {
  readonly activeDays: number;
  readonly stage: EmberStage;
  readonly nextStageAt: number | null;
  readonly daysToNextStage: number;
  readonly achievements: readonly EarnedEmberAchievement[];
}

export interface EmberAchievementDefinition {
  readonly id: EmberAchievementId;
  readonly title: string;
  readonly description: string;
}

export const emberAchievements: readonly EmberAchievementDefinition[] = [
  {
    id: 'first-record',
    title: 'Primer paso',
    description: 'Registraste tu primer movimiento o transferencia.',
  },
  {
    id: 'first-plan',
    title: 'Con intención',
    description: 'Creaste un presupuesto o una meta.',
  },
  {
    id: 'first-review',
    title: 'Ojo atento',
    description: 'Revisaste tus estadísticas por primera vez.',
  },
  {
    id: 'three-active-days',
    title: 'A tu ritmo',
    description: 'Usaste Emberly en tres días distintos.',
  },
  {
    id: 'ten-active-days',
    title: 'Constancia propia',
    description: 'Usaste Emberly en diez días distintos.',
  },
];

export function emberStage(activeDays: number): EmberStage {
  if (!Number.isSafeInteger(activeDays) || activeDays < 0)
    throw new Error('La cantidad de días activos no es válida.');
  if (activeDays >= 10) return 'flarely';
  if (activeDays >= 3) return 'ember';
  return 'chispa';
}

export function createEmberProgress(
  activeDays: number,
  achievements: readonly EarnedEmberAchievement[],
): EmberProgress {
  const stage = emberStage(activeDays);
  const nextStageAt = stage === 'chispa' ? 3 : stage === 'ember' ? 10 : null;
  return {
    activeDays,
    stage,
    nextStageAt,
    daysToNextStage: nextStageAt === null ? 0 : Math.max(0, nextStageAt - activeDays),
    achievements,
  };
}
