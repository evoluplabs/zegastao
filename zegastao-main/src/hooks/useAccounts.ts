import { useUserCollection } from './useCollection';
import type { Account } from '@/types';

export function useAccounts() {
  return useUserCollection<Account>('accounts');
}
