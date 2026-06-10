import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BettingOnboarding } from './betting/BettingOnboarding';
import { AgentInsights } from './betting/AgentInsights';
import { ConfidenceMeter } from './betting/ConfidenceMeter';
import { ReturnCalculator } from './betting/ReturnCalculator';
import { BettingObjectiveWizard, ObjectiveParams } from './betting/BettingObjectiveWizard';
import { BettingResultsGrid } from './betting/BettingResultsGrid';
import { BettingHistory } from './betting/BettingHistory';
import {
  BettingAnalysis, BettingProfile, BettingObjectiveResult,
  BETTING_LEAGUES, BETTING_MARKET_LABELS, BETTING_DISCLAIMER,
} from '@/types';
import { formatBRL } from '@/lib/utils';
import { Sparkles, AlertTriangle, PauseCircle, Target, Search, History, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SingleResult = {
  analysisId: string;
  analysis: BettingAnalysis;
  weeklyBudget: number;
  weeklyStaked: number;
  weeklyLossAlert: boolean;
  remainingBudget: number;
};

const betAnalysisFn = httpsCallable<unknown, SingleResult>(functions, 'betAnalysis');
const objectiveAnalysisFn = httpsCallable<unknown, BettingObjectiveResult>(functions, 'betAnalysis');
const bettingProfileFn = httpsCallable<unknown, { success: boolean; until?: string }>(functions, 'bettingProfile');

type View = 'home' | 'wizard' | 'results' | 'manual' | 'history';

const AGENT_NAMES = ['FormAgent', 'H2HAgent', 'InjuryAgent', 'MatchContextAgent', 'StatsAgent', 'OddsValueAgent', 'BetHistoryAgent', 'StrategyAgent', 'RiskManager', 'Consolidador'];

export function Betting() {
  const { user } = useStore();

  const [profile, setProfile] = useState<BettingProfile | null | 'loading'>('loading');
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manual flow state
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [league, setLeague] = useState<string>(BETTING_LEAGUES[0].key);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [single, setSingle] = useState<SingleResult | null>(null);

  // Objective flow state
  const [objective, setObjective] = useState<BettingObjectiveResult | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'betting_profile', 'main'))
      .then((snap) => setProfile(snap.exists() ? (snap.data() as BettingProfile) : null))
      .catch(() => setProfile(null));
  }, [user]);

  async function analyzeManual() {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setLoading(true);
    setError('');
    setSingle(null);
    try {
      const leagueLabel = BETTING_LEAGUES.find((l) => l.key === league)?.label || league;
      const res = await betAnalysisFn({
        mode: 'single',
        homeTeam, awayTeam, homeTeamId: 0, awayTeamId: 0,
        league: leagueLabel, leagueSportKey: league, date,
      });
      setSingle(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeObjective(params: ObjectiveParams) {
    setView('results');
    setLoading(true);
    setError('');
    setObjective(null);
    try {
      const res = await objectiveAnalysisFn({
        mode: 'objective',
        leagueSportKeys: params.leagueSportKeys,
        date: params.date,
        teamPreferences: params.teamPreferences,
        sessionBudget: params.sessionBudget,
      });
      setObjective(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o objetivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function selfExclude() {
    try {
      await bettingProfileFn({ action: 'self_exclude', days: 7 });
      alert('Apostas pausadas por 7 dias. Cuide-se!');
    } catch {
      //
    }
  }

  if (profile === 'loading') {
    return (
      <div className="flex min-h-60 items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <BettingOnboarding onComplete={() => setProfile('loading')} />
      </div>
    );
  }

  const remaining = Math.max(0, profile.weeklyBudget - profile.weeklyStaked);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Zé Apostador · Beta
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Central de Inteligência</h1>
            <p className="text-sm text-slate-400">9 agentes especialistas, 0 achismo</p>
          </div>
          <button
            onClick={selfExclude}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Pausar
          </button>
        </div>

        {/* Budget bar */}
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Budget semanal</span>
            <span className="font-bold text-slate-100">{formatBRL(profile.weeklyBudget)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (profile.weeklyStaked / profile.weeklyBudget) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Apostado: {formatBRL(profile.weeklyStaked)}</span>
            <span>Restante: {formatBRL(remaining)}</span>
          </div>
        </div>

        {error && view !== 'manual' && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ===== HOME ===== */}
        {view === 'home' && (
          <div className="space-y-3">
            <button
              onClick={() => setView('wizard')}
              className="group w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-sky-500/10 p-5 text-left transition-colors hover:border-emerald-400/50"
            >
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-400" />
                <span className="text-lg font-bold text-slate-100">Criar objetivo de apostas</span>
              </div>
              <p className="text-sm text-slate-400">
                Escolha campeonatos, orçamento e data. Encontramos os jogos e analisamos todos com os 9 agentes.
              </p>
            </button>

            <button
              onClick={() => { setView('manual'); setSingle(null); setError(''); }}
              className="flex w-full items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-colors hover:border-slate-600"
            >
              <Search className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-200">Analisar partida específica</p>
                <p className="text-xs text-slate-500">Digite os times manualmente</p>
              </div>
            </button>

            <button
              onClick={() => setView('history')}
              className="flex w-full items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-colors hover:border-slate-600"
            >
              <History className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-200">Histórico de apostas</p>
                <p className="text-xs text-slate-500">Registre resultados e calibre a inteligência</p>
              </div>
            </button>
          </div>
        )}

        {/* ===== WIZARD ===== */}
        {view === 'wizard' && (
          <BettingObjectiveWizard
            profile={profile}
            remainingBudget={remaining}
            onAnalyze={analyzeObjective}
            onCancel={() => setView('home')}
          />
        )}

        {/* ===== RESULTS (objective) ===== */}
        {view === 'results' && (
          <div className="space-y-4">
            <button onClick={() => setView('home')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" /> Nova análise
            </button>
            {loading && (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center gap-2 text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  Os 9 agentes estão analisando os jogos…
                </div>
                <div className="space-y-1.5">
                  {AGENT_NAMES.map((a, i) => (
                    <div key={a} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'animate-pulse bg-emerald-400' : 'bg-slate-700')} />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loading && objective && <BettingResultsGrid result={objective} />}
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {view === 'history' && (
          <div className="space-y-4">
            <button onClick={() => setView('home')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            <BettingHistory />
          </div>
        )}

        {/* ===== MANUAL (legacy flow) ===== */}
        {view === 'manual' && (
          <div className="space-y-6">
            <button onClick={() => setView('home')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-100">
                <Search className="h-4 w-4 text-emerald-400" />
                Analisar partida específica
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Time da casa</Label>
                  <Input placeholder="Ex: Flamengo" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="h-9 border-slate-700 bg-slate-800 text-slate-100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Time visitante</Label>
                  <Input placeholder="Ex: Palmeiras" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="h-9 border-slate-700 bg-slate-800 text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Liga</Label>
                  <select
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {BETTING_LEAGUES.map((l) => (
                      <option key={l.key} value={l.key}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Data do jogo</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 border-slate-700 bg-slate-800 text-slate-100" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                onClick={analyzeManual}
                disabled={loading || !homeTeam.trim() || !awayTeam.trim()}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Agentes analisando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Analisar com IA
                  </span>
                )}
              </Button>
            </div>

            {single && (
              <div className="space-y-4">
                {single.weeklyLossAlert && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Você já apostou mais de 50% do seu budget semanal. Tome cuidado!
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                  <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-500/10 to-sky-500/5 px-4 py-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{single.analysis.league}</span>
                      <span>{single.analysis.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {single.analysis.homeTeam} vs {single.analysis.awayTeam}
                    </h3>
                    <div className="mt-3">
                      <ConfidenceMeter score={single.analysis.confidenceScore} />
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Recomendação principal</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-100">{single.analysis.recommendedSelection}</p>
                          <p className="text-xs text-slate-400">
                            {BETTING_MARKET_LABELS[single.analysis.recommendedMarket] || single.analysis.recommendedMarket}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-emerald-400">@{single.analysis.recommendedOdd}</p>
                          <p className="text-xs text-slate-500">Odd mínima: {single.analysis.minimumOdd}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-700/50 pt-2 text-sm">
                        <span className="text-slate-400">Stake sugerido</span>
                        <span className="font-bold text-emerald-400">{formatBRL(single.analysis.suggestedStake)}</span>
                      </div>
                    </div>

                    {single.analysis.alternativeSelection && (
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2 text-sm">
                        <div>
                          <span className="text-xs text-slate-500">Alternativa: </span>
                          <span className="font-medium text-slate-200">{single.analysis.alternativeSelection}</span>
                        </div>
                        <span className="font-bold text-slate-200">@{single.analysis.alternativeOdd}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Análise completa</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{single.analysis.finalAnalysis}</p>
                    </div>

                    <div className="rounded-xl bg-slate-800/40 p-1">
                      <AgentInsights analysis={single.analysis} />
                    </div>

                    <ReturnCalculator />

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                      <p className="text-[11px] leading-relaxed text-amber-300/90">{BETTING_DISCLAIMER}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
