import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import type { Milestone, DailyTask, Investment } from '@/types';
import { useUserCollection } from './useCollection';

// Marcos da trilha atingidos.
export function useMilestones() {
  const user = useStore((s) => s.user);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'journey_milestones');
    return onSnapshot(ref, (snap) => {
      setMilestones(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Milestone));
    });
  }, [user]);
  return milestones;
}

// Tarefas diárias geradas pelo job noturno.
export function useDailyTasks() {
  const user = useStore((s) => s.user);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'daily_tasks', 'today');
    return onSnapshot(ref, (snap) => {
      setTasks(snap.exists() ? (snap.data().tasks as DailyTask[]) || [] : []);
    });
  }, [user]);
  return tasks;
}

export function useInvestments() {
  return useUserCollection<Investment>('investments');
}
