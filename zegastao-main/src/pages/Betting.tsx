import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BettingOnboarding } from './betting/BettingOnboarding';
import { AgentInsights } from './betting/AgentInsights';
import { ConfidenceMeter } from './betting/ConfidenceMeter';
import { ReturnCalculator } from './betting/ReturnCalculator';
import { BettingAnalysis, BettingProfile, BETTING_LEAGUES, BETTING_MARKET_LABELS, BETTING_DISCLAIMER } from '@/types';
import { formatBRL } from '@/lib/utils';
import { Sparkles, AlertTriangle, TrendingUp, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const betAnalysisFn = httpsCallable<unknown, {
  analysisId: string;
  analysis: BettingAnalysis;
  weeklyBudget: number;
  weeklyStaked: number;
  weeklyLossAlert: boolean;
  remainingBudget: number;
}>(functions, 'betAnalysis');

const bettingProfileFn = httpsCallable<unknown, { success: boolean; until?: string }>(functions, 'bettingProfile');

export function Betting() {
  const { user } = useStore();

  const [profile, setProfile] = useState<BettingProfile | null | 'loading'>('loading');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [league, setLeague] = useState<string>(BETTING_LEAGUES[0].key);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    analysisId: string;
    analysis: BettingAnalysis;
    weeklyBudget: number;
    weeklyStaked: number;
    weeklyLossAlert: boolean;
    remainingBudget: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'betting_profile', 'main'))
      .then((snap) => setProfile(snap.exists() ? snap.data() as BettingProfile : null))
      .catch(() => setProfile(null));
  }, [user]);

  async function analyze() {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const leagueLabel = BETTING_LEAGUES.find((l) => l.key === league)?.label || league;
      const res = await betAnalysisFn({
        homeTeam, awayTeam,
        homeTeamId: 0,
        awayTeamId: 0,
        league: leagueLabel,
        leagueSportKey: league,
        date,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar. Tente novamente.';
      setError(msg);
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

  // Loading do perfil
  if (profile === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-60">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Onboarding
  if (profile === null) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <BettingOnboarding onComplete={() => setProfile('loading')} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              Zé Apostador · Beta
            </div>
          </div>
          <h1 className="text-2xl font-bold">Central de Inteligência</h1>
          <p className="text-sm text-muted-foreground">9 agentes analisam cada jogo por você</p>
        </div>
        <button
          onClick={selfExclude}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <PauseCircle className="h-3.5 w-3.5" />
          Pausar apostas
        </button>
      </div>

      {/* Budget bar */}
      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget semanal</span>
          <span className="font-bold">{formatBRL(profile.weeklyBudget)}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (profile.weeklyStaked / profile.weeklyBudget) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Apostado: {formatBRL(profile.weeklyStaked)}</span>
          <span>Restante: {formatBRL(Math.max(0, profile.weeklyBudget - profile.weeklyStaked))}</span>
        </div>
      </div>

      {/* Formulário de análise */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Analisar jogo
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Time da casa</Label>
            <Input
              placeholder="Ex: Flamengo"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Time visitante</Label>
            <Input
              placeholder="Ex: Palmeiras"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Liga</Label>
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {BETTING_LEAGUES.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data do jogo</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <Button
          className="w-full"
          onClick={analyze}
          disabled={loading || !homeTeam.trim() || !awayTeam.trim()}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              Agentes analisando…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Analisar com IA
            </span>
          )}
        </Button>

        {loading && (
          <div className="space-y-1.5">
            {['FormAgent', 'H2HAgent', 'OddsValueAgent', 'StrategyAgent', 'Consolidador'].map((agent, i) => (
              <div key={agent} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i === 0 ? 'bg-primary animate-pulse' : 'bg-muted'
                )} />
                {agent} analisando…
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {result.weeklyLossAlert && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Você já apostou mais de 50% do seu budget semanal. Tome cuidado!
            </div>
          )}

          {/* Card principal */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-emerald-50 px-4 py-4 border-b">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{result.analysis.league}</span>
                <span className="text-xs text-muted-foreground">{result.analysis.date}</span>
              </div>
              <h3 className="text-lg font-bold">
                {result.analysis.homeTeam} vs {result.analysis.awayTeam}
              </h3>
              <div className="mt-3">
                <ConfidenceMeter score={result.analysis.confidenceScore} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Recomendação */}
              <div className="rounded-xl bg-green-50 border border-green-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Recomendação principal</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{result.analysis.recommendedSelection}</p>
                    <p className="text-xs text-muted-foreground">
                      {BETTING_MARKET_LABELS[result.analysis.recommendedMarket] || result.analysis.recommendedMarket}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-green-700">@{result.analysis.recommendedOdd}</p>
                    <p className="text-xs text-muted-foreground">Odd mínima: {result.analysis.minimumOdd}</p>
                  </div>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stake sugerido</span>
                  <span className="font-bold text-green-700">{formatBRL(result.analysis.suggestedStake)}</span>
                </div>
              </div>

              {/* Alternativa */}
              {result.analysis.alternativeSelection && (
                <div className="rounded-xl bg-muted/40 border px-3 py-2 text-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Alternativa: </span>
                    <span className="font-medium">{result.analysis.alternativeSelection}</span>
                  </div>
                  <span className="font-bold">@{result.analysis.alternativeOdd}</span>
                </div>
              )}

              {/* Análise narrativa */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Análise completa</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.analysis.finalAnalysis}</p>
              </div>

              {/* Agentes */}
              <AgentInsights analysis={result.analysis} />

              {/* Retorno potencial da múltipla */}
              <ReturnCalculator />

              {/* Disclaimer */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-[11px] text-amber-800 leading-relaxed">{BETTING_DISCLAIMER}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
