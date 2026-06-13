import { useUserCollection } from './useCollection';
import type { CategoryBudget } from '@/types';

export function useCategoryBudgets() {
  return useUserCollection<CategoryBudget>('category_budgets');
}
