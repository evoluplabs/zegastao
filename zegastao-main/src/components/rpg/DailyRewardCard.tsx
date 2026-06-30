// E3 — Recompensa diária + streak
// Check-in diário: alimenta o companion + ganha XP crescente.
import { useState } from 'react';
import { Flame, Star } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { setProfile } from '@/lib/firestore';
import { getSpecies } from '@/lib/rpg/character';
import { getDailyRewardState, calcDailyXP, streakMessage } from '@/lib/rpg/dailyReward';
import { cn } from '@/lib/utils';

export function DailyRewardCard() {
  const profile = useStore((s) => s.profile);
  const setProfileStore = useStore((s) => s.setProfile);
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  const lastCheckIn = profile?.lastCheckIn;
  const currentStreak = profile?.dailyStreak ?? 0;

  const state = getDailyRewardState(lastCheckIn, currentStreak);

  const species = getSpecies(profile?.companionSpeciesId);
  const companionName = profile?.companionName || species.suggestedName;

  async function handleCheckIn() {
    if (!state.canCheckIn || checking) return;
    setChecking(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const newStreak = currentStreak + 1;
      const xpGain = calcDailyXP(currentStreak);
      const currentXP = (profile?.xp ?? 0) + xpGain;

      await setProfile({ lastCheckIn: today, dailyStreak: newStreak, xp: currentXP });

      // Optimistic update in store
      if (profile) {
        setProfileStore({
          ...profile,
          xp: currentXP,
          lastCheckIn: today,
          dailyStreak: newStreak,
        });
      }

      setJustChecked(true);
    } finally {
      setChecking(false);
    }
  }

  if (!state.canCheckIn && !justChecked) {
    return (
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0 companion-idle">
          {species.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-bold">{currentStreak} dias de streak</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Próximo check-in em {state.hoursUntilNext}h
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground">Próximo XP</p>
          <p className="font-bold text-gold">+{calcDailyXP(currentStreak)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-14 w-14 rounded-xl flex items-center justify-center text-3xl shrink-0',
          justChecked ? 'bg-primary/10 companion-happy' : 'bg-gold/10 companion-idle'
        )}>
          {species.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-tight">
            {justChecked ? `${companionName} adorou! 🎉` : `Alimentar ${companionName}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {justChecked
              ? streakMessage(currentStreak + 1, companionName)
              : streakMessage(currentStreak, companionName)
            }
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-semibold">
              {justChecked ? currentStreak + 1 : currentStreak} dias
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground">XP</p>
          <p className={cn('font-bold text-lg', justChecked ? 'text-primary animate-count-up' : 'text-gold')}>
            +{calcDailyXP(currentStreak)}
          </p>
        </div>
      </div>

      {!justChecked && (
        <button
          onClick={handleCheckIn}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-gold-foreground py-2.5 text-sm font-bold hover:bg-gold/90 active:scale-95 transition-all disabled:opacity-60"
        >
          <Star className="h-4 w-4" />
          {checking ? 'Registrando...' : 'Check-in diário'}
        </button>
      )}

      {justChecked && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-center">
          <p className="text-xs font-semibold text-primary">
            ✨ +{calcDailyXP(currentStreak)} XP ganhos! Volte amanhã.
          </p>
        </div>
      )}
    </div>
  );
}
