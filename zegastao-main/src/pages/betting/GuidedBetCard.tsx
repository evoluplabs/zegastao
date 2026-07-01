import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsUsEast } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn, formatBRL } from '@/lib/utils';
import { ZeRound } from '@/types';
import { ShareableBetCard } from './ShareableBetCard';
import { AlertTriangle, Info, TrendingUp, TrendingDown, CheckCircle2, XCircle, Trophy, Frown, ShieldAlert } from 'lucide-react';

const zeRecalcCard = httpsCallable<unknown, RecalcResponse>(functionsUsEast, 'zeRecalcCard');
const zeFeedback = httpsCallable<unknown, { success: boolean; bankroll: number; cycleStatus?: string }>(functionsUsEast, 'zeFeedback');

interface LegResult {
  fixtureId: number;
  market: string;
  status: 'green' | 'up' | 'down' | 'lost';
  message: string;
}
interface RecalcResponse {
  legResults: LegResult[];
  combinedOdd: number;
  newStake: number;
  lostValue: boolean;
  potentialReturn: number;
}

interface Props {
  cycleId: string;
  round: ZeRound;
  referralCode?: string;
  onUpdated: () => void;
}

const STATUS_STYLE: Record<string, { icon: typeof TrendingUp; cls: string }> = {
  green: { icon: CheckCircle2, cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
  up: { icon: TrendingUp, cls: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  down: { icon: TrendingDown, cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  lost: { icon: XCircle, cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
};

export function GuidedBetCard({ cycleId, round, referralCode, onUpdated }: Props) {
  const card = round.card;
  const [odds, setOdds] = useState<Record<string, string>>(
    Object.fromEntries(card.legs.map((l) => [`${l.fixtureId}_${l.market}`, String(l.recommendedOdd)])),
  );
  const [recalc, setRecalc] = useState<RecalcResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sealAccepted, setSealAccepted] = useState(!card.needsSeal);
  const [placed, setPlaced] = useState(round.placed);
  const [result, setResult] = useState<'won' | 'lost' | null>(round.outcome === 'pending' ? null : round.outcome);
  const [payout, setPayout] = useState('');

  const stake = recalc?.newStake ?? card.suggestedStake;
  const potential = recalc?.potentialReturn ?? card.potentialReturn;

  async function recalcNow() {
    setLoading(true);
    try {
      const legOdds = card.legs.map((l) => ({ fixtureId: l.fixtureId, market: l.market, odd: parseFloat(odds[`${l.fixtureId}_${l.market}`]) || l.recommendedOdd }));
      const res = await zeRecalcCard({ cycleId, roundId: round.id, legOdds });
      setRecalc(res.data);
    } catch { /* mantém */ } finally { setLoading(false); }
  }

  async function confirmPlaced() {
    setLoading(true);
    try {
      await zeFeedback({ action: 'placed', cycleId, roundId: round.id, stake });
      setPlaced(true);
      onUpdated();
    } catch { /* */ } finally { setLoading(false); }
  }

  async function recordResult(outcome: 'won' | 'lost') {
    setLoading(true);
    try {
      await zeFeedback({ action: 'result', cycleId, roundId: round.id, outcome, payout: outcome === 'won' ? (parseFloat(payout) || stake * card.combinedOdd) : 0 });
      setResult(outcome);
      onUpdated();
    } catch { /* */ } finally { setLoading(false); }
  }

  // ----- Skip (sem aposta hoje) -----
  if (card.skip) {
    return (
      <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 text-center">
        <p className="text-stone-300">{card.reasoning}</p>
      </div>
    );
  }

  // ----- Já liquidada -----
  if (result) {
    const won = result === 'won';
    return (
      <div className={cn('space-y-4 rounded-2xl border p-5', won ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/20 bg-red-500/5')}>
        <div className="flex items-center gap-2 font-bold text-stone-100">
          {won ? <Trophy className="h-5 w-5 text-green-400" /> : <Frown className="h-5 w-5 text-red-400" />}
          {won ? '🏆 Monstro derrotado!' : '🔴 Você foi derrotado.'}
        </div>
        {won ? (
          <ShareableBetCard
            homeTeam={card.legs[0].homeTeam} awayTeam={card.legs[0].awayTeam}
            selection={card.type === 'multiple' ? `Múltipla @${card.combinedOdd}` : card.legs[0].selection}
            odd={card.combinedOdd} profit={Math.max(0, (parseFloat(payout) || stake * card.combinedOdd) - stake)} referralCode={referralCode}
          />
        ) : (
          <p className="text-sm text-stone-400">Faz parte do raid. O importante é a disciplina — sem correr atrás do prejuízo.</p>
        )}
      </div>
    );
  }

  const isMarginal = card.evPct < 0;

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-stone-900/70',
      isMarginal ? 'border-amber-500/40' : 'border-stone-800')}>
      {/* Cabeçalho */}
      <div className={cn('border-b border-stone-800 px-4 py-3',
        isMarginal ? 'bg-gradient-to-r from-amber-500/10 to-stone-900' : 'bg-gradient-to-r from-green-500/10 to-sky-500/5')}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-stone-100">{card.type === 'multiple' ? `⚔️ Raid: ${card.legs.length} Encontros` : '⚔️ Encontro Único'}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-sm font-extrabold',
            isMarginal ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400')}>
            @{card.combinedOdd}
          </span>
        </div>
        <p className="text-xs text-stone-400">Chance de acertar: {card.combinedProbPct}% · {card.evPct > 0 ? `Vantagem: +${card.evPct}%` : `A casa leva: ${Math.abs(card.evPct)}%`}</p>
      </div>

      <div className="space-y-4 p-4">
        {/* Aviso de aposta marginal — EV negativo, usuário decide */}
        {isMarginal && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Atenção</strong> — A Betano tem vantagem de {Math.abs(card.evPct)}% nessa aposta. Não encontrei odds com vantagem clara, mas aqui está a melhor opção do dia. Você decide.</span>
          </div>
        )}

        {/* Por que essa aposta */}
        <div className="flex items-start gap-2 rounded-xl bg-stone-800/40 p-3 text-sm text-stone-300">
          <Info className={cn('mt-0.5 h-4 w-4 shrink-0', isMarginal ? 'text-amber-400' : 'text-green-400')} /> {card.reasoning}
        </div>

        {/* Análise detalhada dos sub-agentes (form, h2h, stats) */}
        {card.finalAnalysis && (
          <div className="rounded-xl border border-stone-700/50 bg-stone-800/20 p-3">
            <p className="mb-1.5 text-xs font-semibold text-stone-400">📊 Por que o Zé escolheu essa aposta</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-stone-300">{card.finalAnalysis}</p>
          </div>
        )}

        {/* Selo de entendimento (nível agressivo) */}
        {card.needsSeal && !sealAccepted && (
          <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 font-bold text-amber-300"><AlertTriangle className="h-4 w-4" /> Antes de seguir, entenda:</div>
            <p className="text-sm leading-relaxed text-amber-100/90">{card.seal}</p>
            <div className="flex gap-2">
              <Button onClick={() => setSealAccepted(true)} className="flex-1 bg-amber-500 text-stone-950 hover:bg-amber-400">Topo, é diversão 🎲</Button>
              <button onClick={onUpdated} className="flex-1 rounded-lg border border-stone-600 text-sm text-stone-300">Me mostra algo mais seguro</button>
            </div>
          </div>
        )}

        {(sealAccepted) && (
          <>
            {/* Pernas + odd real */}
            <div className="space-y-3">
              {card.legs.map((leg) => {
                const key = `${leg.fixtureId}_${leg.market}`;
                const lr = recalc?.legResults.find((r) => r.fixtureId === leg.fixtureId && r.market === leg.market);
                const style = lr ? STATUS_STYLE[lr.status] : null;
                return (
                  <div key={key} className="rounded-xl border border-stone-800 bg-stone-800/30 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-stone-500">{leg.league} · {leg.marketLabel}</span>
                      <span className="text-xs text-stone-500">previsão: {leg.modelProbPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-stone-100">{leg.homeTeam} x {leg.awayTeam}</p>
                        <p className="text-sm text-green-400">{leg.selection}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500">só vale ≥ {leg.minOdd}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-stone-400">odd:</span>
                          <input
                            type="number" step="0.01" inputMode="decimal"
                            value={odds[key]} onChange={(e) => setOdds((p) => ({ ...p, [key]: e.target.value }))}
                            className="h-8 w-16 rounded-md border border-stone-700 bg-stone-900 px-2 text-right text-sm text-stone-100 focus:border-green-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {lr && style && (
                      <div className={cn('mt-2 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-xs', style.cls)}>
                        <style.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {lr.message}
                      </div>
                    )}
                    {/* Passo a passo */}
                    <ol className="mt-2 space-y-0.5 text-[11px] text-stone-500">
                      {leg.steps.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}
                    </ol>
                  </div>
                );
              })}
            </div>

            <Button onClick={recalcNow} loading={loading} variant="outline" className="w-full border-stone-700 text-stone-200">
              Conferir odds na Betano e recalcular
            </Button>

            {/* Stake + retorno */}
            <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
              <div>
                <p className="text-xs text-stone-400">Apostar</p>
                <p className="text-xl font-extrabold text-green-400">{formatBRL(stake)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400">Pode pagar</p>
                <p className="text-lg font-bold text-stone-100">+{formatBRL(potential)}</p>
              </div>
            </div>

            {recalc?.lostValue && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Alguma odd caiu demais e perdeu o valor. Considere pular ou buscar outra opção.
              </div>
            )}

            {/* Ações */}
            {!placed ? (
              <Button onClick={confirmPlaced} loading={loading} disabled={stake <= 0} className="w-full bg-green-500 text-stone-950 hover:bg-green-400">
                ⚔️ Entrei no Encontro — {formatBRL(stake)}
              </Button>
            ) : (
              <div className="space-y-2 rounded-xl border border-stone-800 bg-stone-800/30 p-3">
                <p className="text-sm font-medium text-stone-200">Resultado do Encontro 👀</p>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" inputMode="decimal" value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Quanto recebeu (R$)" className="h-9 flex-1 rounded-md border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 focus:border-green-400 focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => recordResult('won')} loading={loading} className="flex-1 bg-green-500 text-stone-950 hover:bg-green-400">Vitória! 🏆</Button>
                  <Button onClick={() => recordResult('lost')} loading={loading} variant="outline" className="flex-1 border-stone-700 text-stone-300">Derrota 🔴</Button>
                </div>
                <p className="text-[11px] text-stone-500">Confirmar o resultado deixa o Zé mais esperto com você 🧠</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
