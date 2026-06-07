import { useUserCollection } from './useCollection';
import type { Debt } from '@/types';

export function useDebts() {
  return useUserCollection<Debt>('debts');
}
