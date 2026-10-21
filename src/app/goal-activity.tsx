import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { GoalActivityScreen } from '../modules/goals/presentation/goal-activity-screen';

export default function GoalActivity(): ReactElement {
  const { goals } = useServices();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalId = typeof id === 'string' ? id : '';
  return <GoalActivityScreen key={goalId} repository={goals} goalId={goalId} />;
}
