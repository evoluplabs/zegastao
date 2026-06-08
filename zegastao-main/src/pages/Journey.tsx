import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Trophy, X, PartyPopper, Gift } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { updateUserDoc } from '@/lib/firestore';
import { useMilestones, useDailyTasks } from '@/hooks/useJourney';
import { useReferral } from '@/hooks/useReferral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareableCard } from '@/components/share/ShareableCard';
import { MILESTONE_ORDER, PHASE_LABELS, type Milestone } from '@/types';
import { cn } from '@/lib/utils';
import { track, Events } from '@/lib/analytics';

const DIFFICULTY: Record<string, string> = { easy: 'fácil', medium: 'média', hard: 'difícil' };

const MILESTONE_EMOJIS: Record<string, string> = {
  first_positive: '🌱',
  priciest_debt_cleared: '💥',
  all_debts_cleared: '🎉',
  reserve_1m: '🛡️',
  reserve_3m: '🏰',
  first_investment: '🌱',
  invested_1k: '📈',
  invested_10k: '🚀',
  passive_10: '💰',
  passive_100: '🏆',
};

const TASK_CATEGORY_ICONS: Record<string, string> = {
  renda_extra: '💰',
  economia: '✂️',
  aprendizado: '📚',
  investimento: '📈',
};

function CelebrationModal({
  milestone,
  onClose,
}: {
  milestone: Milestone;
  onClose: () => void;
}) {
  const milestoneInfo = MILESTONE_ORDER.find((m) => m.id === milestone.id);
  const emoji = MILESTONE_EMOJIS[milestone.id] || '🎯';
  const { referralUrl, share: shareReferral } = useReferral();
  const [referred, setReferred] = useState(false);

  async function handleReferral() {
    const r = await shareReferral('celebration');
    if (r === 'copied') setReferred(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative my-auto w-full max-w-sm rounded-2xl border bg-card shadow-md animate-slide-up overflow-hidden">
        <div className="px-6 pt-7 pb-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-success/15 border border-success/30 px-3 py-1 text-xs font-semibold text-success mb-4">
            <PartyPopper className="h-3 w-3" />
            Marco conquistado!
          </div>

          {/* Card compartilhável como IMAGEM (alavanca 1) */}
          <ShareableCard
            emoji={emoji}
            title={milestoneInfo?.name || 'Conquista!'}
            subtitle="Conquista na minha jornada financeira"
            shareText={`Conquistei "${milestoneInfo?.name}" no Zé Gastão! ${emoji} Saindo do vermelho à liberdade.`}
            shareUrl={referralUrl || window.location.origin}
            analyticsId={Events.MILESTONE_SHARED}
          />
        </div>

        {/* CTA de indicação no momento de maior orgulho (alavanca 3) */}
        <div className="mx-6 mb-4 mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
            <Gift className="h-4 w-4 text-primary" /> Chama um amigo pra essa jornada
          </p>
          <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
            Indique alguém que precisa sair das dívidas — vocês dois ganham.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleReferral}>
            {referred ? 'Link copiado! 🎉' : 'Indicar um amigo'}
          </Button>
        </div>

        <div className="px-6 pb-6">
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Continuar a jornada
          </Button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Journey() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);
  const milestones = useMilestones();
  const tasks = useDailyTasks();
  const achieved = new Set(milestones.map((m) => m.id));
  const phase = profile?.financialPhase;
  const [celebrating, setCelebrating] = useState<Milestone | null>(null);

  // Detecta novos milestones não celebrados
  useEffect(() => {
    const uncelebrated = milestones.find((m) => !m.celebrationShown);
    if (uncelebrated) {
      setCelebrating(uncelebrated);
      track(Events.MILESTONE_ACHIEVED, { milestoneId: uncelebrated.id });
    }
  }, [milestones]);

  async function dismissCelebration() {
    if (!celebrating || !user) return;
    await updateUserDoc('journey_milestones', celebrating.id, { celebrationShown: true });
    setCelebrating(null);
  }

  return (
    <div className="space-y-5">
      {celebrating && (
        <CelebrationModal milestone={celebrating} onClose={dismissCelebration} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sua trilha</h2>
        {phase && (
          <Badge variant="success" className="gap-1">
            <Trophy className="h-3 w-3" />
            {PHASE_LABELS[phase]}
          </Badge>
        )}
      </div>

      {/* Tarefas de hoje */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ações de hoje</h3>
        {tasks.length === 0 ? (
          <div className="rounded-xl border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Suas tarefas personalizadas aparecem aqui após o processamento noturno (00:00).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/20">
                <span className="text-lg shrink-0">{TASK_CATEGORY_ICONS[t.category] || '⚡'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ⏱ {t.estimatedTime}
                    {t.estimatedReturn && ` · 💰 ${t.estimatedReturn}`}
                    {t.platform && ` · ${t.platform}`}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {DIFFICULTY[t.difficulty] || t.difficulty}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trilha de marcos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Marcos da jornada financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />
            <ol className="space-y-2 relative">
              {MILESTONE_ORDER.map((m, i) => {
                const done = achieved.has(m.id);
                const emoji = MILESTONE_EMOJIS[m.id] || '🎯';
                return (
                  <li key={m.id} className={cn(
                    'flex items-center gap-3 rounded-xl p-3 transition-all',
                    done ? 'bg-success/5 border border-success/20' : 'border border-transparent'
                  )}>
                    <div className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm border',
                      done ? 'bg-success text-success-foreground border-success' : 'bg-card border-border text-muted-foreground/40'
                    )}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        done ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}>
                        {emoji} {m.name}
                      </p>
                    </div>
                    {done && (
                      <Badge variant="outline" className="shrink-0 text-xs border-success/30 text-success">
                        ✓ feito
                      </Badge>
                    )}
                    {!done && i === Array.from(achieved).length && (
                      <Badge variant="outline" className="shrink-0 text-xs border-primary/30 text-primary">
                        próximo
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
