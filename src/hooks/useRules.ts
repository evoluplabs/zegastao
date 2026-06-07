import { useUserCollection } from './useCollection';
import type { Rule } from '@/types';

export function useRules() {
  return useUserCollection<Rule>('rules');
}
