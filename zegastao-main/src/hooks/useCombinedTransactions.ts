import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { usePartnerData } from '@/hooks/usePartnerData';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import { useStore } from '@/store/useStore';
import type { Transaction } from '@/types';

export interface TaggedTransaction extends Transaction {
  _owner: 'me' | 'partner';
  _ownerName: string;
}

export function useCombinedTransactions(monthOnly = false): { data: TaggedTransaction[]; loading: boolean } {
  const showCombined = useStore((s) => s.showCombined);
  const profile = useStore((s) => s.profile);
  const { isLinked } = useSharedFinances();
  const { data: myTxs, loading: myLoading } = useTransactions(monthOnly);
  const { data: partnerData, loading: partnerLoading } = usePartnerData();

  const myName = profile?.name || 'Você';
  const partnerName = partnerData?.profile?.name || 'Parceiro(a)';

  const data = useMemo<TaggedTransaction[]>(() => {
    const tagged = myTxs.map((t) => ({ ...t, _owner: 'me' as const, _ownerName: myName }));
    if (!showCombined || !isLinked || !partnerData?.transactions) return tagged;
    const partnerTagged = partnerData.transactions.map((t) => ({
      ...t,
      _owner: 'partner' as const,
      _ownerName: partnerName,
    }));
    return [...tagged, ...partnerTagged].sort((a, b) => b.date.localeCompare(a.date));
  }, [myTxs, partnerData, showCombined, isLinked, myName, partnerName]);

  return { data, loading: myLoading || (showCombined && isLinked && partnerLoading) };
}
