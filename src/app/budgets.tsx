import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { BudgetsScreen } from '../modules/budgets/presentation/budgets-screen';

export default function Budgets(): ReactElement {
  const { budgets, categories } = useServices();
  const router = useRouter();
  return (
    <BudgetsScreen
      repository={budgets}
      categories={categories}
      onCategories={() => router.push('/categories')}
    />
  );
}
