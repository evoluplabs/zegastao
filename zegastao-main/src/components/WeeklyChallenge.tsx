import { useState, useEffect, useMemo } from 'react';
import { Zap, CheckCircle2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/utils';
import type { Transaction } from '@/types';

interface CategoryItem {
  name: string;
  amount: number;
  pct: number;
  ideal: number;
}

interface Props {
  overBudgetCategories: CategoryItem[];
  currentMonthTx: Transaction[];
}

const CHALLENGE_TEMPLATES: Record<string, { emoji: string; verb: string; tip: string }> = {
  'Delivery':        { emoji: '🛵', verb: 'pedir delivery',     tip: 'Cozinhe em casa — além de economizar, é mais saudável!' },
  'Restaurantes':    { emoji: '🍽️', verb: 'comer fora',         tip: 'Prefira marmita ou leve comida de casa esta semana.' },
  'Transporte app':  { emoji: '🚗', verb: 'usar Uber/99',       tip: 'Teste o transporte público nessa rota esta semana.' },
  'Lazer':           { emoji: '🎮', verb: 'gastos com lazer',   tip: 'Explore opções gratuitas: parques, streamings que já paga, YouTube.' },
  'Streaming':       { emoji: '📺', verb: 'assinar novos serviços', tip: 'Você já tem serviços suficientes. Cancele um para testar.' },
  'Beleza':          { emoji: '💅', verb: 'gastos com beleza',  tip: 'Uma semana sem salão já faz diferença no bolso.' },
  'Vestuário':       { emoji: '👗', verb: 'comprar roupas',     tip: 'Desafio: sete dias sem comprar nada de vestuário.' },
};

const STORAGE_KEY = 'ze_weekly_challenge';

interface ChallengeState {
  category: string;
  acceptedAt: string; // ISO date
  weekStart: string;  // YYYY-MM-DD
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function getDaysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

export function WeeklyChallenge({ overBudgetCategories, currentMonthTx }: Props) {
  const [saved, setSaved] = useState<ChallengeState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ChallengeState = JSON.parse(raw);
        if (parsed.weekStart === getWeekStart()) setSaved(parsed);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  const bestCategory = useMemo(
    () => overBudgetCategories.find((c) => CHALLENGE_TEMPLATES[c.name]),
    [overBudgetCategories]
  );

  if (!bestCategory) return null;

  const tmpl = CHALLENGE_TEMPLATES[bestCategory.name]!;
  const overspend = bestCategory.amount - (bestCategory.ideal / 100) * (bestCategory.amount / (bestCategory.pct / 100));
  const savingsEstimate = Math.max(50, Math.round(overspend * 0.6 / 10) * 10);

  function accept() {
    const state: ChallengeState = {
      category: bestCategory!.name,
      acceptedAt: new Date().toISOString(),
      weekStart: getWeekStart(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(state);
  }

  function dismiss() {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
  }

  if (saved) {
    const days = getDaysSince(saved.acceptedAt);
    const daysLeft = Math.max(0, 7 - days);
    const progress = Math.min(7, days);
    const txInCategory = currentMonthTx.filter(
      (t) => t.category === saved.category && t.date >= saved.acceptedAt.slice(0, 10)
    );
    const slipped = txInCategory.length > 0;

    return (
      <div className={cn(
        'rounded-2xl border p-4',
        slipped ? 'border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20'
                : 'border-primary/20 bg-primary/5'
      )}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Desafio da semana
          </p>
          {days >= 7 && !slipped && (
            <span className="flex items-center gap-1 text-xs font-semibold text-success">
              <Trophy className="h-3.5 w-3.5" /> Concluído!
            </span>
          )}
        </div>
        <p className="text-sm font-semibold mb-1">
          {tmpl.emoji} 7 dias sem {tmpl.verb}
        </p>
        {slipped ? (
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
            Escorregou {txInCategory.length}x — mas continua tentando! Cada dia conta. 💪
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mb-2">{tmpl.tip}</p>
        )}

        {/* Progresso 7 dias */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-2 rounded-full',
                i < progress
                  ? slipped ? 'bg-amber-400' : 'bg-primary'
                  : 'bg-secondary'
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{daysLeft > 0 ? `${daysLeft} dia${daysLeft > 1 ? 's' : ''} restantes` : 'Semana concluída!'}</span>
          <button onClick={dismiss} className="hover:text-foreground transition-colors">desistir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-500/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
        <Zap className="h-3.5 w-3.5 text-amber-500" /> Desafio da semana
      </p>
      <p className="text-sm font-semibold mb-0.5">
        {tmpl.emoji} 7 dias sem {tmpl.verb}
      </p>
      <p className="text-xs text-muted-foreground mb-1">{tmpl.tip}</p>
      <p className="text-xs font-semibold text-success mb-3">
        Potencial: economiza ~{formatBRL(savingsEstimate)} este mês
      </p>
      <Button size="sm" variant="outline" className="gap-1.5 border-amber-400/50 hover:bg-amber-100/50" onClick={accept}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Aceitar desafio
      </Button>
    </div>
  );
}
