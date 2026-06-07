import { orderBy, where } from 'firebase/firestore';
import { useUserCollection } from './useCollection';
import type { Transaction } from '@/types';
import { currentMonthStart } from '@/lib/utils';

export function useTransactions(monthOnly = false) {
  const constraints = monthOnly
    ? [where('date', '>=', currentMonthStart()), orderBy('date', 'desc')]
    : [orderBy('date', 'desc')];
  return useUserCollection<Transaction>('transactions', constraints);
}
