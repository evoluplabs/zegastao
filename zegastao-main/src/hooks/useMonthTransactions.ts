// Lista de transações de UM mês específico. Só é montado quando o usuário abre
// um mês — assim a tela de Transações não lê a coleção inteira de uma vez.
import { where, orderBy } from 'firebase/firestore';
import { useUserCollection } from './useCollection';
import type { Transaction } from '@/types';

export function useMonthTransactions(start: string, endExclusive: string) {
  return useUserCollection<Transaction>('transactions', [
    where('date', '>=', start),
    where('date', '<', endExclusive),
    orderBy('date', 'desc'),
  ]);
}
