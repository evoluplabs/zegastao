import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useTransactions } from '@/hooks/useTransactions';
import { levelFromXP, xpProgressInLevel, levelName, hpFinanceiro, hpStatus, PROFESSION_ICONS, PROFESSION_LABELS } from '@/lib/xp';
import { isNeutral, currentMonthISO } from '@/lib/finance';
import { cn } from '@/lib/utils';
import { getAvatar, getClass } from '@/lib/rpg/character';
import type { Profession } from '@/lib/xp';

interface CharacterPanelProps {
  compact?: boolean;
}

export function CharacterPanel({ compact = false }: CharacterPanelProps) {
  const { profile } = useStore();
  const { data: transactions } = useTransactions();

  const xp = profile?.xp ?? 0;
  const lv = levelFromXP(xp);
  const { current: xpCurrent, needed: xpNeeded, pct: xpPct } = xpProgressInLevel(xp);
  const title = levelName(lv);

  const viewMonth = currentMonthISO();
  const monthTxs = useMemo(
    () => (transactions ?? []).filter(
      (t) => t.date?.slice(0, 7) === viewMonth && !isNeutral(t.category)
    ),
    [transactions, viewMonth]
  );
  const entradas = monthTxs.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const saidas   = monthTxs.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const hp = hpFinanceiro(entradas, saidas);
  const { label: hpLabel, color: hpColor } = hpStatus(hp);

  const primaryProfession: Profession = useMemo(() => {
    const pxp = profile?.professionXP ?? {};
    const profs: Profession[] = ['poupador', 'quitador', 'freelancer', 'investidor'];
    return profs.reduce((best, p) =>
      (pxp[p] ?? 0) > (pxp[best] ?? 0) ? p : best, profs[0]
    );
  }, [profile?.professionXP]);

  const initials = (profile?.name ?? 'Aventureiro')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  // Avatar e classe escolhidos no onboarding
  const avatar = profile?.avatarId ? getAvatar(profile.avatarId) : null;
  const charClass = profile?.characterClass ? getClass(profile.characterClass) : null;

  const hpColorClass = {
    emerald: 'bg-green-500',
    yellow:  'bg-yellow-400',
    orange:  'bg-orange-500',
    red:     'bg-red-500',
  }[hpColor] ?? 'bg-green-500';

  const hpTextClass = {
    emerald: 'text-green-400',
    yellow:  'text-yellow-400',
    orange:  'text-orange-400',
    red:     'text-red-400',
  }[hpColor] ?? 'text-green-400';

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 ring-2 ring-gold/20">
          {avatar ? <span className="text-xl">{avatar.emoji}</span> : <span className="text-white font-bold text-sm">{initials}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{profile?.name ?? 'Aventureiro'}</p>
          <p className="text-[10px] text-muted-foreground">Lv {lv} · {charClass ? `${charClass.emoji} ${charClass.name}` : `${PROFESSION_ICONS[primaryProfession]} ${PROFESSION_LABELS[primaryProfession]}`}</p>
        </div>
        <div className={cn('text-xs font-bold tabular-nums', hpTextClass)}>
          {hp >= 0 ? hp : 0}%
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center shrink-0 ring-2 ring-gold/25 shadow-lg">
          {avatar ? <span className="text-3xl">{avatar.emoji}</span> : <span className="text-white font-bold text-xl">{initials}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-foreground text-lg leading-tight truncate">
            {profile?.name ?? 'Aventureiro'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Lv {lv} · {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {charClass ? `${charClass.emoji} ${charClass.name}` : `${PROFESSION_ICONS[primaryProfession]} ${PROFESSION_LABELS[primaryProfession]}`}
            {' · '}{PROFESSION_ICONS[primaryProfession]} {PROFESSION_LABELS[primaryProfession]}
          </p>
        </div>
      </div>

      {/* HP bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">❤️ HP Financeiro</span>
          <span className={cn('font-bold tabular-nums', hpTextClass)}>
            {Math.max(0, hp)}% · {hpLabel}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', hpColorClass)}
            style={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
          />
        </div>
      </div>

      {/* XP bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">⚡ XP — Lv {lv}</span>
          <span className="text-amber-400 font-bold tabular-nums">{xpCurrent}/{xpNeeded}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
