import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsUsEast } from '@/firebase';
import { useStore } from '@/store/useStore';
import { cn, formatBRL } from '@/lib/utils';
import { BettingHistory as BettingHistoryType, BETTING_MARKET_LABELS } from '@/types';
import { CheckCircle2, XCircle, Clock, TrendingUp, Loader2 } from 'lucide-react';

const bettingProfileFn = httpsCallable<unknown, { success: boolean }>(functionsUsEast, 'bettingProfile');

interface MarketStat {
  market: string;
  hit: number;
  total: number;
}

export function BettingHistory() {
  const { user } = useStore();
  const [bets, setBets] = useState<BettingHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [profitInputs, setProfitInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'betting_history'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BettingHistoryType)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const settled = bets.filter((b) => b.outcome === 'hit' || b.outcome === 'miss');
  const hits = settled.filter((b) => b.outcome === 'hit').length;
  const hitRate = settled.length ? Math.round((hits / settled.length) * 100) : 0;

  // Breakdown por mercado
  const byMarket = new Map<string, MarketStat>();
  for (const b of settled) {
    const m = b.market || 'desconhecido';
    const e = byMarket.get(m) || { market: m, hit: 0, total: 0 };
    e.total += 1;
    if (b.outcome === 'hit') e.hit += 1;
    byMarket.set(m, e);
  }
  const marketStats = [...byMarket.values()].sort((a, b) => (b.hit / b.total) - (a.hit / a.total));
  const bestMarket = marketStats[0];

  async function recordResult(bet: BettingHistoryType, outcome: 'hit' | 'miss') {
    setRecordingId(bet.id);
    try {
      const raw = profitInputs[bet.id];
      const profit = outcome === 'hit'
        ? (raw !== undefined && raw !== '' ? Number(raw) : parseFloat((bet.amount * (bet.odd - 1)).toFixed(2)))
        : -bet.amount;
      await bettingProfileFn({ action: 'update_bet_result', betId: bet.id, outcome, profit });
    } catch {
      // erro silencioso; o snapshot reflete o estado real
    } finally {
      setRecordingId(null);
    }
  }

  function hitRateColor(rate: number): string {
    if (rate >= 60) return 'text-green-400';
    if (rate >= 40) return 'text-amber-400';
    return 'text-red-400';
  }

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
        {settled.length === 0 ? (
          <p className="text-center text-sm text-stone-400">
            Ainda sem apostas avaliadas. Registre o resultado das suas apostas para alimentar a inteligência das próximas análises.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400">Taxa de acerto geral</p>
                <p className={cn('text-4xl font-extrabold', hitRateColor(hitRate))}>{hitRate}%</p>
                <p className="text-xs text-stone-500">{hits} de {settled.length} apostas</p>
              </div>
              {bestMarket && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-right">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-green-400">
                    <TrendingUp className="h-3 w-3" /> Melhor mercado
                  </p>
                  <p className="font-bold text-stone-100">{BETTING_MARKET_LABELS[bestMarket.market] || bestMarket.market}</p>
                  <p className="text-xs text-stone-400">{Math.round((bestMarket.hit / bestMarket.total) * 100)}% de acerto</p>
                </div>
              )}
            </div>

            {/* Breakdown por mercado */}
            <div className="mt-4 space-y-2">
              {marketStats.map((m) => {
                const rate = Math.round((m.hit / m.total) * 100);
                return (
                  <div key={m.market} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-300">{BETTING_MARKET_LABELS[m.market] || m.market}</span>
                      <span className="text-stone-400">{rate}% ({m.hit}/{m.total})</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                      <div className={cn('h-full rounded-full', rate >= 60 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {bestMarket && (
              <p className="mt-4 rounded-lg bg-stone-800/60 px-3 py-2 text-xs text-stone-400">
                💡 Seu melhor mercado é <span className="font-semibold text-green-400">{BETTING_MARKET_LABELS[bestMarket.market] || bestMarket.market}</span> — os agentes priorizam esse padrão nas próximas análises.
              </p>
            )}
          </>
        )}
      </div>

      {/* Lista de apostas */}
      <div className="space-y-2">
        <h3 className="px-1 text-sm font-semibold text-stone-300">Suas apostas</h3>
        {bets.length === 0 && (
          <p className="px-1 text-sm text-stone-500">Nenhuma aposta registrada ainda.</p>
        )}
        {bets.map((bet) => (
          <div key={bet.id} className="rounded-xl border border-stone-800 bg-stone-900/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-200">{bet.selection}</p>
                <p className="text-xs text-stone-500">
                  {BETTING_MARKET_LABELS[bet.market] || bet.market} · @{bet.odd} · {formatBRL(bet.amount)}
                </p>
              </div>
              {bet.outcome === 'hit' && (
                <span className="flex items-center gap-1 text-sm font-semibold text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> {formatBRL(bet.profit)}
                </span>
              )}
              {bet.outcome === 'miss' && (
                <span className="flex items-center gap-1 text-sm font-semibold text-red-400">
                  <XCircle className="h-4 w-4" /> {formatBRL(bet.profit)}
                </span>
              )}
              {bet.outcome === 'pending' && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Clock className="h-3.5 w-3.5" /> Pendente
                </span>
              )}
            </div>

            {bet.outcome === 'pending' && (
              <div className="mt-3 flex items-center gap-2 border-t border-stone-800 pt-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Retorno R$"
                  value={profitInputs[bet.id] ?? ''}
                  onChange={(e) => setProfitInputs((p) => ({ ...p, [bet.id]: e.target.value }))}
                  className="h-9 w-28 rounded-lg border border-stone-700 bg-stone-800 px-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-green-400 focus:outline-none"
                />
                <button
                  disabled={recordingId === bet.id}
                  onClick={() => recordResult(bet, 'hit')}
                  className="flex-1 rounded-lg bg-green-500/15 py-2 text-sm font-medium text-green-400 hover:bg-green-500/25 disabled:opacity-40"
                >
                  Acertei
                </button>
                <button
                  disabled={recordingId === bet.id}
                  onClick={() => recordResult(bet, 'miss')}
                  className="flex-1 rounded-lg bg-red-500/15 py-2 text-sm font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-40"
                >
                  Errei
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
