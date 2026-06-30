import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Trophy, X, PartyPopper, Gift, Zap, Link as LinkIcon, Scroll, Map, Award, Swords, BookOpen, Star } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { updateUserDoc } from '@/lib/firestore';
import { useMilestones, useDailyTasks } from '@/hooks/useJourney';
import { useDebts } from '@/hooks/useDebts';
import { useReferral } from '@/hooks/useReferral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareableCard } from '@/components/share/ShareableCard';
import { QuestCard } from '@/components/QuestCard';
import { SagaTrail } from '@/components/rpg/SagaTrail';
import { HuntBoard } from '@/components/rpg/HuntBoard';
import { SkillTree } from '@/components/rpg/SkillTree';
import { Bestiary } from '@/components/rpg/Bestiary';
import { generateIncomeTaskSuggestions } from '@/lib/incomeTaskSuggestions';
import { MILESTONE_ORDER, PHASE_LABELS, type Milestone } from '@/types';
import { formatBRL, formatPct, cn } from '@/lib/utils';
import { track, Events } from '@/lib/analytics';

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
  caixinha_completed: '🐷',
};

function CelebrationModal({
  milestone,
  onClose,
}: {
  milestone: Milestone;
  onClose: () => void;
}) {
  const milestoneInfo = MILESTONE_ORDER.find((m) => m.id === milestone.id);
  const milestoneName = milestoneInfo?.name || milestone.name || 'Conquista!';
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
            Conquista desbloqueada!
          </div>

          <ShareableCard
            emoji={emoji}
            title={milestoneName}
            subtitle="Conquista na minha jornada financeira"
            shareText={`Conquistei "${milestoneName}" no Zé Gastão! ${emoji} Saindo do vermelho à liberdade.`}
            shareUrl={referralUrl || window.location.origin}
            analyticsId={Events.MILESTONE_SHARED}
          />
        </div>

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
            Continuar a aventura
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

type JourneyTab = 'trilha' | 'cacada' | 'missoes' | 'skills' | 'conquistas';

export function Journey() {
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);
  const milestones = useMilestones();
  const tasks = useDailyTasks();
  const { data: debts } = useDebts();
  const achieved = new Set(milestones.map((m) => m.id));
  const phase = profile?.financialPhase;
  const [celebrating, setCelebrating] = useState<Milestone | null>(null);
  const [tab, setTab] = useState<JourneyTab>('trilha');

  const skills = profile?.skills || [];
  const incomeTaskSuggestions = generateIncomeTaskSuggestions(skills, debts, []).slice(0, 3);

  const activeDebts = debts.filter((d) => d.status === 'active');
  const topDebt = [...activeDebts].sort((a, b) => b.interestRateMonthly - a.interestRateMonthly)[0];
  const totalDebtBalance = activeDebts.reduce((s, d) => s + d.totalBalance, 0);

  useEffect(() => {
    const uncelebrated = milestones.find((m) => !m.celebrationShown);
    if (uncelebrated) {
      setCelebrating(uncelebrated);
      track(Events.MILESTONE_ACHIEVED, { milestoneId: uncelebrated.id });
    }
  }, [milestones]);

  async function dismissCelebration() {
    if (!celebrating || !user) return;
    try {
      await updateUserDoc('journey_milestones', celebrating.id, { celebrationShown: true });
    } catch {
      // Ignora erro de rede
    } finally {
      setCelebrating(null);
    }
  }

  const TABS: { id: JourneyTab; label: string; icon: typeof Map }[] = [
    { id: 'trilha',    label: 'Trilha',     icon: Map },
    { id: 'cacada',   label: 'Caçada',     icon: Swords },
    { id: 'missoes',  label: 'Missões',    icon: Zap },
    { id: 'skills',   label: 'Skills',     icon: Star },
    { id: 'conquistas', label: 'Álbum',   icon: Award },
  ];

  return (
    <div className="space-y-5">
      {celebrating && (
        <CelebrationModal milestone={celebrating} onClose={dismissCelebration} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Scroll className="h-5 w-5 text-gold" /> Jornada
        </h2>
        {phase && (
          <Badge variant="success" className="gap-1">
            <Trophy className="h-3 w-3" />
            {PHASE_LABELS[phase]}
          </Badge>
        )}
      </div>

      {/* Abas — scrollável no mobile */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
                tab === t.id ? 'bg-gold text-gold-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Trilha (Saga) ── */}
      {tab === 'trilha' && <SagaTrail />}

      {/* ── Caçada de Renda Extra ── */}
      {tab === 'cacada' && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card p-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Conclua missões de renda extra. Seu poder aumenta com o nível de Freelancer.
            </p>
          </div>
          <HuntBoard />
        </div>
      )}

      {/* ── Missões ── */}
      {tab === 'missoes' && (
        <div className="space-y-5">
          {/* Boss em foco */}
          {topDebt && (
            <div className="rounded-2xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🎯 Boss em Foco</p>
                <Badge variant="destructive" className="text-[10px]">
                  {formatPct(topDebt.interestRateMonthly * 100, 1)} a.m.
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="font-bold text-base">{topDebt.creditor}</p>
                <p className="text-sm font-semibold">{formatBRL(topDebt.totalBalance)}</p>
              </div>
              {totalDebtBalance > 0 && (
                <>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.max(5, 100 - (topDebt.totalBalance / totalDebtBalance) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {activeDebts.length} dívida{activeDebts.length !== 1 ? 's' : ''} ativa{activeDebts.length !== 1 ? 's' : ''} · Total {formatBRL(totalDebtBalance)}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Missões de hoje */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Missões de hoje
            </h3>
            {tasks.length === 0 ? (
              <div className="rounded-xl border bg-card p-5 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Suas missões personalizadas aparecem aqui após o processamento noturno (00:00).
                </p>
                {incomeTaskSuggestions.length > 0 && (
                  <p className="text-xs text-primary">
                    Enquanto isso, veja bounties na aba{' '}
                    <button
                      onClick={() => setTab('cacada')}
                      className="underline font-medium"
                    >
                      Caçada
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <QuestCard key={i} task={t} />
                ))}
              </div>
            )}
          </div>

          {/* Bounty Board */}
          {incomeTaskSuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  💰 Bounty Board
                </h3>
                <button
                  onClick={() => setTab('cacada')}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  ver todos <LinkIcon className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {incomeTaskSuggestions.map((t) => (
                  <div key={t.id} className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:border-amber-500/30 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-lg shrink-0">💰</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{t.title}</p>
                      {t.debtContext && (
                        <p className="text-[11px] font-semibold text-green-500 mt-0.5">{t.debtContext}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        💰 {t.estimatedReturn} · ⏱ {t.estimatedTime}
                        {t.platform && ` · ${t.platform}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-amber-400">+100 XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Skills ── */}
      {tab === 'skills' && <SkillTree />}

      {/* ── Álbum de Conquistas (Bestiário) ── */}
      {tab === 'conquistas' && <Bestiary />}
    </div>
  );
}
