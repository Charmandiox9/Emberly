import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import emberCompanion from '../../../../assets/ember/ember-companion.png';
import { emberAchievements, type EmberProgress, type EmberStage } from '../index';
import { screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';

interface EmberProgressCardProps {
  readonly progress: EmberProgress;
}

const stageNames: Readonly<Record<EmberStage, string>> = {
  chispa: 'Chispa',
  ember: 'Ember',
  flarely: 'Flarely',
};

export function EmberProgressCard({ progress }: EmberProgressCardProps): ReactElement {
  const theme = useTheme();
  const latestAchievement = progress.achievements.at(-1);
  const definition = latestAchievement
    ? emberAchievements.find((achievement) => achievement.id === latestAchievement.id)
    : undefined;

  return (
    <Animated.View
      entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)}
      accessibilityLabel={`Progreso de Ember. Etapa ${stageNames[progress.stage]}. ${progress.activeDays} días distintos de actividad.`}
      style={[screenStyles.card, { backgroundColor: theme.surface }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Animated.Image
          accessibilityLabel={`Ember en su etapa ${stageNames[progress.stage]}`}
          source={emberCompanion}
          resizeMode="contain"
          style={{ width: 88, height: 88 }}
          entering={FadeInDown.delay(80).duration(320).reduceMotion(ReduceMotion.System)}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            ¡Hola! Vamos paso a paso
          </Text>
          <Text style={[screenStyles.body, { color: theme.text }]}>
            Etapa {stageNames[progress.stage]} · {progress.activeDays}{' '}
            {progress.activeDays === 1 ? 'día' : 'días'} distintos
          </Text>
        </View>
      </View>
      {progress.nextStageAt === null ? (
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          Has llegado a la etapa Flarely. Los días sin actividad no restan tu progreso.
        </Text>
      ) : (
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          {progress.daysToNextStage === 1
            ? 'Un día activo más para la siguiente etapa.'
            : `${progress.daysToNextStage} días activos más para la siguiente etapa.`}{' '}
          No necesitas usar Emberly todos los días.
        </Text>
      )}
      {definition ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, gap: 4 }}>
          <Text style={[screenStyles.caption, { color: theme.primary }]}>
            Logro: {definition.title}
          </Text>
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            {definition.description}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
