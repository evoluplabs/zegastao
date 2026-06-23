import { useUserCollection } from './useCollection';
import type { CreditCard, CardInstallment } from '@/types';

export function useCreditCards() {
  return useUserCollection<CreditCard>('creditCards');
}

export function useCardInstallments() {
  return useUserCollection<CardInstallment>('cardInstallments');
}
