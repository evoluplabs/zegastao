import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { MandateOnboarding } from './betting/MandateOnboarding';
import { GuidedBetCard } from './betting/GuidedBetCard';
import { UploadOdds } from './betting/UploadOdds';
import { GuruAudit } from './betting/GuruAudit';
import { BettingTour } from './betting/BettingTour';
import { ZeMandate, ZeCycle, ZeRound, ZE_RISK_LEVELS, ZeRiskLevel, ZeGuidedCard } from '@/types';
import { cn, formatBRL } from '@/lib/utils';
import { Sparkles, PauseCircle, Loader2, Target, RefreshCw, Flag, Trophy, Camera, Search } from 'lucide-react';

const zeMandate = httpsCallable<unknown, { mandate: ZeMandate | null; success?: boolean }>(functions, 'zeMandate');
const zeCycle = httpsCallable<unknown, CycleGetResponse & BuildResponse & { cycleId?: string }>(functions, 'zeCycle');

interface CycleGetResponse { cycle: ZeCycle | null; rounds: ZeRound[] }
interface BuildResponse { roundId?: string | null; empty?: boolean; card?: ZeGuidedCard }

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
  const [noBetMsg, setNoBetMsg] = useState('');
  const [riskLevel, setRiskLevel] = useState<ZeRiskLevel>(1);
  const [targetMultiplier, setTargetMultiplier] = useState(25);
  const [tool, setTool] = useState<'none' | 'upload' | 'guru'>('none');

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
    setNoBetMsg('');
    try {
      const res = await zeCycle({ action: 'build', riskLevel, targetMultiplier: riskLevel === 2 ? targetMultiplier : undefined });
      // Sem jogos no dia, ou achou jogos mas nenhuma aposta com valor → mostra o porquê.
      if (res.data.empty) {
        setNoBetMsg('Não encontrei jogos hoje nos campeonatos que você escolheu. Tenta de novo amanhã, ou adiciona mais campeonatos no seu mandato.');
      } else if (res.data.card?.skip) {
        setNoBetMsg(res.data.card.reasoning || 'Hoje não achei nenhuma aposta que valha a pena pra você. Prefiro não sugerir do que sugerir aposta ruim. Volta amanhã!');
      }
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
    return (
      <div className="min-h-screen bg-slate-950 py-8">
        <MandateOnboarding onComplete={() => {
          localStorage.removeItem('ze_apostador_tour_v2');
          setMandate('loading');
        }} />
      </div>
    );
  }

  const target = cycle ? cycle.budget * (1 + cycle.growthTargetPct / 100) : 0;
  const progressPct = cycle ? Math.min(100, Math.max(0, ((cycle.currentBankroll - cycle.budget * (1 - cycle.stopLossPct / 100)) / (target - cycle.budget * (1 - cycle.stopLossPct / 100))) * 100)) : 0;
  const latestPending = rounds.find((r) => r.outcome === 'pending' && !r.skip);
  const closed = cycle && ['won', 'lost', 'aborted'].includes(cycle.status);
  const betsCompleted = rounds.filter((r) => r.outcome !== 'pending').length;

  return (
    <>
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
          <button data-tour="pause" onClick={selfExclude} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200">
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
            <div className="flex items-center gap-2 text-slate-100"><Target className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-bold">Comece por aqui</h2></div>
            <p className="text-sm text-slate-400">Um ciclo é a sua rodada de apostas. Você vai começar com {formatBRL(mandate.cycleBudget)} e o Zé encerra sozinho quando você chegar na meta ou pra te proteger de perder demais.</p>
            <RiskPicker riskLevel={riskLevel} setRiskLevel={setRiskLevel} targetMultiplier={targetMultiplier} setTargetMultiplier={setTargetMultiplier} />
            <Button data-tour="start" onClick={startCycle} loading={loading} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">Começar a apostar</Button>
          </div>
        )}

        {/* Ciclo ativo */}
        {cycle && !closed && (
          <>
            <div data-tour="banca" className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Quanto você tem agora</span>
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
              <div data-tour="card">
                <GuidedBetCard cycleId={cycle.id} round={latestPending} referralCode={referralCode} onUpdated={loadCycle} />
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Bora achar uma aposta?</h2>
                  <p className="mt-1 text-sm text-slate-400">É só clicar no botão verde. O Zé olha os jogos do dia, analisa cada um e te mostra uma aposta pronta. <span className="text-slate-300">Você não precisa enviar foto nem nada.</span></p>
                </div>
                {noBetMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                    <Search className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{noBetMsg}</span>
                  </div>
                )}
                <RiskPicker riskLevel={riskLevel} setRiskLevel={setRiskLevel} targetMultiplier={targetMultiplier} setTargetMultiplier={setTargetMultiplier} />
                <Button data-tour="build" onClick={buildRound} loading={building} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  <RefreshCw className="h-4 w-4" /> {building ? 'O Zé está analisando os jogos…' : 'Achar uma aposta pra mim'}
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

        {/* Ferramentas: print da Betano (Waze das Odds) e desmascarador de guru */}
        <div data-tour="tools" className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-400">Ferramentas extras <span className="font-normal text-slate-600">· opcional</span></h3>
            <p className="text-xs text-slate-600">Não precisa usar pra apostar. Use só se quiser conferir uma odd ou um palpite.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTool(tool === 'upload' ? 'none' : 'upload')}
              className={cn('flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold', tool === 'upload' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 text-slate-300')}>
              <Camera className="h-4 w-4" /> Ler print da Betano
            </button>
            <button onClick={() => setTool(tool === 'guru' ? 'none' : 'guru')}
              className={cn('flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold', tool === 'guru' ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-slate-700 text-slate-300')}>
              <Search className="h-4 w-4" /> Desmascarar guru
            </button>
          </div>
          {tool === 'upload' && <UploadOdds />}
          {tool === 'guru' && <GuruAudit />}
        </div>

        <p className="px-2 text-center text-[11px] leading-relaxed text-slate-600">
          Análise educacional, sem garantia de resultado. Apostas têm risco de perda total. +18. Jogue com responsabilidade.
        </p>
      </div>
    </div>

    <BettingTour betsCompleted={betsCompleted} />
    </>
  );
}

function RiskPicker({ riskLevel, setRiskLevel, targetMultiplier, setTargetMultiplier }: {
  riskLevel: ZeRiskLevel; setRiskLevel: (l: ZeRiskLevel) => void;
  targetMultiplier: number; setTargetMultiplier: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Como você quer jogar?</p>
      <div className="grid grid-cols-2 gap-2">
        {ZE_RISK_LEVELS.filter((r) => r.level !== 3).map((r) => (
          <button key={r.level} onClick={() => setRiskLevel(r.level)} className={cn('rounded-xl border p-2 text-left text-xs', riskLevel === r.level ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700')}>
            <span className="font-semibold text-slate-100">{r.emoji} {r.label}</span>
          </button>
        ))}
      </div>
      {riskLevel === 2 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Tentar multiplicar por quanto? Quanto mais alto, mais difícil acertar.</p>
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
