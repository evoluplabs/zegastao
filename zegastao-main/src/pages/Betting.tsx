import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { MandateOnboarding } from './betting/MandateOnboarding';
import { GuidedBetCard } from './betting/GuidedBetCard';
import { ZeMandate, ZeCycle, ZeRound, ZE_RISK_LEVELS, ZeRiskLevel } from '@/types';
import { cn, formatBRL } from '@/lib/utils';
import { Sparkles, PauseCircle, Loader2, Target, RefreshCw, Flag, Trophy } from 'lucide-react';

const zeMandate = httpsCallable<unknown, { mandate: ZeMandate | null; success?: boolean }>(functions, 'zeMandate');
const zeCycle = httpsCallable<unknown, CycleGetResponse & BuildResponse & { cycleId?: string }>(functions, 'zeCycle');

interface CycleGetResponse { cycle: ZeCycle | null; rounds: ZeRound[] }
interface BuildResponse { roundId?: string | null; empty?: boolean }

const TARGET_OPTIONS = [10, 25, 50, 100];

export function Betting() {
  const { user } = useStore();
  const [mandate, setMandate] = useState<ZeMandate | null | 'loading'>('loading');
  const [cycle, setCycle] = useState<ZeCycle | null>(null);
  const [rounds, setRounds] = useState<ZeRound[]>([]);
  const [referralCode, setReferralCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [riskLevel, setRiskLevel] = useState<ZeRiskLevel>(1);
  const [targetMultiplier, setTargetMultiplier] = useState(25);

  const loadCycle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await zeCycle({ action: 'get' });
      setCycle(res.data.cycle);
      setRounds(res.data.rounds || []);
      if (res.data.cycle) setRiskLevel(res.data.cycle.riskLevel);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar o ciclo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await zeMandate({ action: 'get' });
        setMandate(res.data.mandate);
        if (res.data.mandate) {
          setRiskLevel(res.data.mandate.maxAutoRiskLevel);
          await loadCycle();
        }
      } catch {
        setMandate(null);
      }
      getDoc(doc(db, 'users', user.uid, 'profile', 'main'))
        .then((s) => setReferralCode(s.exists() ? (s.data().referralCode as string | undefined) : undefined))
        .catch(() => {});
    })();
  }, [user, loadCycle]);

  async function startCycle() {
    setLoading(true);
    setError('');
    try {
      await zeCycle({ action: 'start', riskLevel });
      await loadCycle();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar o ciclo.');
    } finally {
      setLoading(false);
    }
  }

  async function buildRound() {
    setBuilding(true);
    setError('');
    try {
      await zeCycle({ action: 'build', riskLevel, targetMultiplier: riskLevel === 2 ? targetMultiplier : undefined });
      await loadCycle();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não consegui montar a aposta agora. Tente outra data ou campeonato.');
    } finally {
      setBuilding(false);
    }
  }

  async function abortCycle() {
    if (!confirm('Encerrar este ciclo? Você poderá começar outro depois.')) return;
    await zeCycle({ action: 'abort' });
    await loadCycle();
  }

  async function selfExclude() {
    await zeMandate({ action: 'self_exclude', days: 7 });
    alert('Apostas pausadas por 7 dias. Cuide-se! 💚');
    setMandate('loading');
    const res = await zeMandate({ action: 'get' });
    setMandate(res.data.mandate);
  }

  if (mandate === 'loading') {
    return <div className="flex min-h-60 items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>;
  }
  if (mandate === null) {
    return <div className="min-h-screen bg-slate-950 py-8"><MandateOnboarding onComplete={() => setMandate('loading')} /></div>;
  }

  const target = cycle ? cycle.budget * (1 + cycle.growthTargetPct / 100) : 0;
  const progressPct = cycle ? Math.min(100, Math.max(0, ((cycle.currentBankroll - cycle.budget * (1 - cycle.stopLossPct / 100)) / (target - cycle.budget * (1 - cycle.stopLossPct / 100))) * 100)) : 0;
  const latestPending = rounds.find((r) => r.outcome === 'pending' && !r.skip);
  const closed = cycle && ['won', 'lost', 'aborted'].includes(cycle.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3 w-3" /> Zé Apostador 2.0 · Copa
            </div>
            <h1 className="text-2xl font-bold">Seu ciclo de apostas</h1>
            <p className="text-sm text-slate-400">Aposta com cabeça, fézinha consciente</p>
          </div>
          <button onClick={selfExclude} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200">
            <PauseCircle className="h-3.5 w-3.5" /> Pausar
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

        {/* Sem ciclo ativo → começar */}
        {(!cycle || closed) && (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            {closed && (
              <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm', cycle!.status === 'won' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300')}>
                {cycle!.status === 'won' ? <Trophy className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                Ciclo {cycle!.status === 'won' ? 'fechado no azul! 🎯' : cycle!.status === 'lost' ? 'encerrado no stop-loss.' : 'encerrado.'} Banca final: {formatBRL(cycle!.currentBankroll)}.
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-100"><Target className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-bold">Começar um novo ciclo</h2></div>
            <p className="text-sm text-slate-400">Orçamento {formatBRL(mandate.cycleBudget)} · meta +{mandate.growthTargetPct}% · stop-loss {mandate.stopLossPct}%</p>
            <RiskPicker riskLevel={riskLevel} setRiskLevel={setRiskLevel} targetMultiplier={targetMultiplier} setTargetMultiplier={setTargetMultiplier} />
            <Button onClick={startCycle} loading={loading} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">Iniciar ciclo</Button>
          </div>
        )}

        {/* Ciclo ativo */}
        {cycle && !closed && (
          <>
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Banca do ciclo</span>
                <span className="font-bold text-emerald-400">{formatBRL(cycle.currentBankroll)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Início {formatBRL(cycle.budget)}</span>
                <span>Meta {formatBRL(target)}</span>
              </div>
            </div>

            {latestPending ? (
              <GuidedBetCard cycleId={cycle.id} round={latestPending} referralCode={referralCode} onUpdated={loadCycle} />
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-400">Nenhuma aposta montada agora. Bora procurar uma boa pro seu ciclo?</p>
                <RiskPicker riskLevel={riskLevel} setRiskLevel={setRiskLevel} targetMultiplier={targetMultiplier} setTargetMultiplier={setTargetMultiplier} />
                <Button onClick={buildRound} loading={building} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  <RefreshCw className="h-4 w-4" /> {building ? 'O Zé está analisando os jogos…' : 'Buscar aposta pro ciclo'}
                </Button>
              </div>
            )}

            {/* Histórico de rodadas */}
            {rounds.filter((r) => r.outcome !== 'pending' || r.skip).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400">Rodadas anteriores</h3>
                {rounds.filter((r) => r.outcome !== 'pending').map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
                    <span className="text-slate-300">{r.type === 'multiple' ? `Múltipla ${r.legs.length}j` : r.legs[0]?.selection} @{r.combinedOdd}</span>
                    <span className={cn('font-semibold', r.outcome === 'won' ? 'text-emerald-400' : 'text-red-400')}>{r.outcome === 'won' ? `+${formatBRL(r.payout || 0)}` : 'Perdeu'}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={abortCycle} className="w-full rounded-xl border border-slate-800 py-2 text-xs text-slate-500 hover:text-slate-300">Encerrar ciclo</button>
          </>
        )}

        <p className="px-2 text-center text-[11px] leading-relaxed text-slate-600">
          Análise educacional, sem garantia de resultado. Apostas têm risco de perda total. +18. Jogue com responsabilidade.
        </p>
      </div>
    </div>
  );
}

function RiskPicker({ riskLevel, setRiskLevel, targetMultiplier, setTargetMultiplier }: {
  riskLevel: ZeRiskLevel; setRiskLevel: (l: ZeRiskLevel) => void;
  targetMultiplier: number; setTargetMultiplier: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Estilo da aposta</p>
      <div className="grid grid-cols-2 gap-2">
        {ZE_RISK_LEVELS.filter((r) => r.level !== 3).map((r) => (
          <button key={r.level} onClick={() => setRiskLevel(r.level)} className={cn('rounded-xl border p-2 text-left text-xs', riskLevel === r.level ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700')}>
            <span className="font-semibold text-slate-100">{r.emoji} {r.label}</span>
          </button>
        ))}
      </div>
      {riskLevel === 2 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Mirar quanto? (quanto maior, mais difícil)</p>
          <div className="flex gap-2">
            {TARGET_OPTIONS.map((t) => (
              <button key={t} onClick={() => setTargetMultiplier(t)} className={cn('flex-1 rounded-lg border px-2 py-1.5 text-sm', targetMultiplier === t ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-slate-700 text-slate-300')}>{t}x</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
