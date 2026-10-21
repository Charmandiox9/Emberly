import type { ReactElement } from 'react';
import { useServices } from '../application/services';
import { CategoriesScreen } from '../modules/categories/presentation/categories-screen';

export default function Categories(): ReactElement {
  const { categories } = useServices();
  return <CategoriesScreen repository={categories} />;
}
