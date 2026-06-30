// E6 — Ranking global (lê leaderboard/global — 1 doc, 1 read)
// Privacidade: sem R$, dívidas ou saldo — apenas stats de jogo.
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { Crown, Flame } from 'lucide-react';
import { getAvatar, getClass } from '@/lib/rpg/character';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/lib/rpg/social';

const RANK_BADGES = ['🥇', '🥈', '🥉'];

function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const avatar = getAvatar(entry.avatarId);
  const cls = getClass(entry.characterClass);

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
      isMe ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-transparent'
    )}>
      <div className="w-7 text-center shrink-0">
        {entry.rank <= 3
          ? <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
          : <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
        }
      </div>
      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">
        {avatar.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', isMe && 'text-primary')}>
          {entry.alias} {isMe && '(você)'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {cls.emoji} {cls.name} · Lv {entry.level}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-gold">{entry.xp.toLocaleString('pt-BR')} XP</p>
        <div className="flex items-center gap-0.5 justify-end">
          <Flame className="h-2.5 w-2.5 text-orange-500" />
          <span className="text-[10px] text-muted-foreground">{entry.dailyStreak}d</span>
        </div>
      </div>
    </div>
  );
}

export function Leaderboard() {
  const user = useStore((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'leaderboard', 'global');
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEntries((data.top100 as LeaderboardEntry[]) ?? []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-2">
        <Crown className="h-8 w-8 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Ranking sendo calculado — atualiza 1× por dia.
        </p>
        <p className="text-xs text-muted-foreground">
          Complete check-ins e missões para subir no ranking!
        </p>
      </div>
    );
  }

  const myUid = user?.uid;
  const myEntry = entries.find((e) => e.uid === myUid);
  const top10 = entries.slice(0, 10);
  const myRankOutside = myEntry && myEntry.rank > 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-4 w-4 text-gold" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Top Aventureiros da Semana
        </p>
      </div>

      {top10.map((entry) => (
        <EntryRow key={entry.uid} entry={entry} isMe={entry.uid === myUid} />
      ))}

      {myRankOutside && myEntry && (
        <>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground px-2">sua posição</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <EntryRow entry={myEntry} isMe />
        </>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-1">
        Ranking atualizado 1× por dia às 00:00
      </p>
    </div>
  );
}
