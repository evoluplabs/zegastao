import { useUserCollection } from './useCollection';
import type { Caixinha } from '@/types';

export function useCaixinhas() {
  return useUserCollection<Caixinha>('caixinhas');
}
