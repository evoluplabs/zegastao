// E4 — Bestiário / Álbum de Conquistas
// Milestones renderizados como cartas de criaturas capturadas.
import { CheckCircle2, Lock } from 'lucide-react';
import { useMilestones } from '@/hooks/useJourney';
import { MILESTONE_ORDER } from '@/types';
import { cn } from '@/lib/utils';

const MILESTONE_EMOJIS: Record<string, string> = {
  first_positive:       '🌱',
  priciest_debt_cleared:'💥',
  all_debts_cleared:    '🎉',
  reserve_1m:           '🛡️',
  reserve_3m:           '🏰',
  first_investment:     '🌱',
  invested_1k:          '📈',
  invested_10k:         '🚀',
  passive_10:           '💰',
  passive_100:          '🏆',
  caixinha_completed:   '🐷',
};

const MILESTONE_RARITY: Record<string, { label: string; color: string; bg: string }> = {
  first_positive:       { label: 'Comum',    color: 'text-primary',   bg: 'bg-primary/5 border-primary/20' },
  priciest_debt_cleared:{ label: 'Incomum',  color: 'text-gold',      bg: 'bg-gold/5 border-gold/20' },
  all_debts_cleared:    { label: 'Raro',     color: 'text-gold',      bg: 'bg-gold/10 border-gold/30' },
  reserve_1m:           { label: 'Incomum',  color: 'text-primary',   bg: 'bg-primary/5 border-primary/20' },
  reserve_3m:           { label: 'Raro',     color: 'text-info',      bg: 'bg-info/5 border-info/20' },
  first_investment:     { label: 'Incomum',  color: 'text-gold',      bg: 'bg-gold/5 border-gold/20' },
  invested_1k:          { label: 'Raro',     color: 'text-gold',      bg: 'bg-gold/10 border-gold/30' },
  invested_10k:         { label: 'Épico',    color: 'text-boss',      bg: 'bg-boss/5 border-boss/20' },
  passive_10:           { label: 'Épico',    color: 'text-boss',      bg: 'bg-boss/5 border-boss/20' },
  passive_100:          { label: 'Lendário', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  caixinha_completed:   { label: 'Comum',    color: 'text-primary',   bg: 'bg-primary/5 border-primary/20' },
};

export function Bestiary() {
  const milestones = useMilestones();
  const achieved = new Set(milestones.map((m) => m.id));
  const capturedCount = MILESTONE_ORDER.filter((m) => achieved.has(m.id)).length;

  return (
    <div className="space-y-4">
      {/* Progresso do álbum */}
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gold/10 flex items-center justify-center text-2xl shrink-0">📖</div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">Bestiário do Aventureiro</p>
          <p className="text-xs text-muted-foreground">Criaturas financeiras capturadas</p>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${Math.round((capturedCount / MILESTONE_ORDER.length) * 100)}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-bold text-gold">{capturedCount}/{MILESTONE_ORDER.length}</p>
          <p className="text-[10px] text-muted-foreground">capturadas</p>
        </div>
      </div>

      {/* Grade de criaturas */}
      <div className="grid grid-cols-2 gap-2.5">
        {MILESTONE_ORDER.map((m) => {
          const done = achieved.has(m.id);
          const emoji = MILESTONE_EMOJIS[m.id] ?? '🎯';
          const rarity = MILESTONE_RARITY[m.id] ?? { label: 'Comum', color: 'text-primary', bg: 'bg-primary/5 border-primary/20' };
          const milestone = milestones.find((ms) => ms.id === m.id);

          return (
            <div key={m.id} className={cn(
              'rounded-xl border p-3 flex flex-col items-center text-center gap-2 transition-all',
              done ? rarity.bg : 'border-border bg-card/40 opacity-50 grayscale'
            )}>
              <div className={cn(
                'h-14 w-14 rounded-xl flex items-center justify-center text-3xl relative',
                done ? 'bg-background' : 'bg-secondary'
              )}>
                {done ? emoji : <Lock className="h-6 w-6 text-muted-foreground/30" />}
                {done && (
                  <CheckCircle2 className="h-4 w-4 text-primary absolute -top-1 -right-1 bg-card rounded-full" />
                )}
              </div>
              <div>
                <p className={cn(
                  'text-[10px] font-bold uppercase tracking-wide',
                  done ? rarity.color : 'text-muted-foreground/40'
                )}>
                  {rarity.label}
                </p>
                <p className={cn(
                  'text-xs font-semibold mt-0.5 leading-tight',
                  done ? 'text-foreground' : 'text-muted-foreground/40'
                )}>
                  {m.name}
                </p>
                {done && milestone?.achievedAt && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {milestone.achievedAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
