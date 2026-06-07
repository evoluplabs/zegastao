import { useUserCollection } from './useCollection';
import type { Goal } from '@/types';

export function useGoals() {
  return useUserCollection<Goal>('goals');
}
