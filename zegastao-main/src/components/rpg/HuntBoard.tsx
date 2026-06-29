// E2 — Caçada de Renda Extra
// Bounty board estilo caçada por tier, com "Seu Poder" (nível Freelancer).
import { useState } from 'react';
import { Swords, Zap, CheckCircle2, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useDebts } from '@/hooks/useDebts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  generateHuntEncounters, freelancerPower, maxEncountersByPower,
  TIER_CONFIG, type HuntTier, type HuntEncounter,
} from '@/lib/rpg/hunt';
import { professionLevel } from '@/lib/xp';

const TIERS: HuntTier[] = ['T1', 'T2', 'T3'];

function EncounterCard({ enc, completed, onComplete }: {
  enc: HuntEncounter;
  completed: boolean;
  onComplete: (enc: HuntEncounter) => void;
}) {
  const cfg = TIER_CONFIG[enc.tier];
  return (
    <div className={cn(
      'rounded-xl border p-4 flex items-start gap-3 transition-all',
      completed
        ? 'border-primary/20 bg-primary/5 opacity-60'
        : `border hover:${cfg.bg} hover:border-primary/30`
    )}>
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0',
        completed ? 'bg-primary/10' : cfg.bg
      )}>
        {completed ? '✅' : cfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm leading-snug', completed && 'line-through text-muted-foreground')}>
          {enc.title}
        </p>
        {enc.debtContext && (
          <p className="text-[11px] font-semibold text-primary mt-0.5">{enc.debtContext}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          💰 {enc.estimatedReturn} · ⏱ {enc.estimatedTime}
          {enc.platform && ` · ${enc.platform}`}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Drop: <span className="text-gold font-semibold">{enc.drop}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={cn('text-xs font-bold', cfg.color)}>+{enc.xpReward} XP</span>
        {!completed && (
          <button
            onClick={() => onComplete(enc)}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            Concluir <ChevronRight className="h-3 w-3" />
          </button>
        )}
        {completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
    </div>
  );
}

export function HuntBoard() {
  const profile = useStore((s) => s.profile);
  const { data: debts } = useDebts();
  const [activeTier, setActiveTier] = useState<HuntTier>('T1');
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const skills = profile?.skills ?? [];
  const freelancerXP = (profile?.professionXP as Record<string, number> | undefined)?.freelancer ?? 0;
  const power = freelancerPower(freelancerXP);
  const maxEnc = maxEncountersByPower(power);

  const encounters = generateHuntEncounters(skills, debts, activeTier).slice(0, maxEnc);

  function handleComplete(enc: HuntEncounter) {
    setCompleted((prev) => new Set([...prev, enc.id]));
    // XP persistence is handled by the parent page / nightly job in production.
    // Here we just give visual feedback.
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho — Seu Poder */}
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center text-2xl shrink-0">⚔️</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seu Poder</p>
          <p className="font-display font-bold text-foreground">Lv {power} Freelancer</p>
          <p className="text-xs text-muted-foreground">Vê até {maxEnc} encontros por sessão</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground">Concluídos</p>
          <p className="font-display font-bold text-gold">{completed.size}</p>
        </div>
      </div>

      {/* Seletor de tier */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
        {TIERS.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const isActive = tier === activeTier;
          return (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors',
                isActive ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
              )}
            >
              <span>{cfg.emoji}</span>
              <span>{tier}</span>
            </button>
          );
        })}
      </div>

      {/* Tier info */}
      <div className={cn('rounded-xl border p-3 text-sm', TIER_CONFIG[activeTier].bg)}>
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="font-semibold">{TIER_CONFIG[activeTier].label}</p>
          <Badge variant="outline" className={cn('text-[10px]', TIER_CONFIG[activeTier].color)}>
            +{TIER_CONFIG[activeTier].xp} XP
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{TIER_CONFIG[activeTier].desc}</p>
      </div>

      {/* Encontros */}
      {encounters.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum encontro disponível para este tier com suas habilidades.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione habilidades no perfil para desbloquear mais caçadas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {encounters.map((enc) => (
            <EncounterCard
              key={enc.id}
              enc={enc}
              completed={completed.has(enc.id)}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
