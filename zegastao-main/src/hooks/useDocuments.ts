import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { useUserCollection } from './useCollection';
import type { Contract, UserDocument, CopilotNotes, NegotiationAlert } from '@/types';

export function useContracts() {
  return useUserCollection<Contract>('contracts');
}

export function useDocuments() {
  return useUserCollection<UserDocument>('documents');
}

// Anotações automáticas do copiloto (contexto pessoal).
export function useCopilotNotes() {
  const user = useStore((s) => s.user);
  const [notes, setNotes] = useState<CopilotNotes | null>(null);
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'personal_context', 'copilot_notes');
    return onSnapshot(ref, (snap) => setNotes(snap.exists() ? (snap.data() as CopilotNotes) : null));
  }, [user]);
  return notes;
}

export function useNegotiationAlerts() {
  const user = useStore((s) => s.user);
  const [alerts, setAlerts] = useState<NegotiationAlert[]>([]);
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'negotiation_alerts', 'latest');
    return onSnapshot(ref, (snap) => setAlerts(snap.exists() ? (snap.data().alerts as NegotiationAlert[]) || [] : []));
  }, [user]);
  return alerts;
}
