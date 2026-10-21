import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../../application/services';
import { GoalsScreen } from '../../modules/goals/presentation/goals-screen';

export default function Goals(): ReactElement {
  const { goals } = useServices();
  const router = useRouter();
  return (
    <GoalsScreen
      repository={goals}
      onActivity={(id) => router.push({ pathname: '/goal-activity', params: { id } })}
    />
  );
}
