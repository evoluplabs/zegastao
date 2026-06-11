import { useMemo, useRef, useState } from 'react';
import { X, Share2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareNodeAsImage } from '@/lib/shareImage';
import { generateMonthlyReportPdf } from '@/lib/reportPdf';
import { formatBRL, formatPct } from '@/lib/utils';
import { track, Events } from '@/lib/analytics';
import type { Transaction, Goal, Debt } from '@/types';

interface Props {
  transactions: Transaction[]; // transações do mês anterior
  goals: Goal[];
  debts?: Debt[];
  monthlyIncome?: number;
  monthLabel: string;          // ex: "maio"
  onClose: () => void;
}

const DISMISS_KEY = 'ze-monthly-report-dismissed';

/** Retorna true se o relatório do mês anterior ainda não foi visto e estamos na 1ª semana do mês */
export function shouldShowMonthlyReport(): boolean {
  const now = new Date();
  if (now.getDate() > 7) return false;
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
  return localStorage.getItem(DISMISS_KEY) !== currentKey;
}

export function dismissMonthlyReport() {
  const now = new Date();
  localStorage.setItem(DISMISS_KEY, `${now.getFullYear()}-${now.getMonth()}`);
}

export function MonthlyReport({ transactions, goals, debts = [], monthlyIncome = 0, monthLabel, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'done'>('idle');

  const summary = useMemo(() => {
    const incomes = transactions.filter((t) => t.amount > 0);
    const expenses = transactions.filter((t) => t.amount < 0);
    const totalIn = incomes.reduce((s, t) => s + t.amount, 0);
    const totalOut = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
    const balance = totalIn - totalOut;

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    const activeGoals = goals.filter((g) => g.status === 'active');
    const topGoal = activeGoals.sort(
      (a, b) => (b.currentAmount / (b.targetAmount || 1)) - (a.currentAmount / (a.targetAmount || 1))
    )[0];

    return { totalIn, totalOut, balance, topCategory, topGoal };
  }, [transactions, goals]);

  function close() {
    dismissMonthlyReport();
    onClose();
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setState('working');
    const result = await shareNodeAsImage(cardRef.current, {
      fileName: `meu-resumo-${monthLabel}-ze-gastao.png`,
      text: `Meu resumo financeiro de ${monthLabel} no Zé Gastão 💪`,
      url: 'https://zegastao.com.br',
    });
    track(Events.WIN_SHARED, { type: 'monthly_report', result });
    setState(result === 'error' ? 'idle' : 'done');
    if (result !== 'error') setTimeout(() => setState('idle'), 2500);
  }

  async function handlePdf() {
    setPdfState('working');
    try {
      await generateMonthlyReportPdf({
        monthLabel,
        transactions,
        goals,
        debts,
        monthlyIncome,
      });
      setPdfState('done');
      setTimeout(() => setPdfState('idle'), 2500);
    } catch {
      setPdfState('idle');
    }
  }

  const positive = summary.balance >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <h2 className="font-bold text-base">Seu resumo de {monthLabel} 📊</h2>
          <button onClick={close} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Card que vira imagem */}
          <div
            ref={cardRef}
            className="relative w-full overflow-hidden rounded-3xl text-white mx-auto"
            style={{
              aspectRatio: '4 / 5',
              background: positive
                ? 'linear-gradient(150deg, #16a34a 0%, #15803d 50%, #1d4ed8 100%)'
                : 'linear-gradient(150deg, #1d4ed8 0%, #2563eb 50%, #f59e0b 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, #ffffff55 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-6">
              <span className="text-xs font-bold uppercase tracking-widest opacity-90 text-center">
                Meu mês de {monthLabel} · Zé Gastão
              </span>

              <div className="space-y-3">
                <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3 text-center">
                  <p className="text-[10px] uppercase font-semibold opacity-80">Saldo do mês</p>
                  <p className="text-2xl font-black">{positive ? '+' : ''}{formatBRL(summary.balance)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5 text-center">
                    <p className="text-[9px] uppercase font-semibold opacity-80">Entrou</p>
                    <p className="text-sm font-bold">{formatBRL(summary.totalIn)}</p>
                  </div>
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5 text-center">
                    <p className="text-[9px] uppercase font-semibold opacity-80">Saiu</p>
                    <p className="text-sm font-bold">{formatBRL(summary.totalOut)}</p>
                  </div>
                </div>
                {summary.topCategory && (
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5 text-center">
                    <p className="text-[9px] uppercase font-semibold opacity-80">Maior gasto</p>
                    <p className="text-sm font-bold">{summary.topCategory[0]} · {formatBRL(summary.topCategory[1])}</p>
                  </div>
                )}
                {summary.topGoal && (
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5 text-center">
                    <p className="text-[9px] uppercase font-semibold opacity-80">Meta: {summary.topGoal.name}</p>
                    <p className="text-sm font-bold">
                      {formatPct(Math.min(100, (summary.topGoal.currentAmount / (summary.topGoal.targetAmount || 1)) * 100))} concluída
                    </p>
                  </div>
                )}
              </div>

              <span className="text-xs font-semibold opacity-90 text-center">
                {positive ? 'Mês no azul! 💪' : 'Próximo mês a gente vira o jogo 🎯'} · zegastao.com.br
              </span>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleShare} disabled={state === 'working'}>
            {state === 'done' ? (
              <><Check className="h-4 w-4" /> Pronto!</>
            ) : state === 'working' ? (
              <>Gerando imagem…</>
            ) : (
              <><Share2 className="h-4 w-4" /> Compartilhar no WhatsApp</>
            )}
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={handlePdf} disabled={pdfState === 'working'}>
            {pdfState === 'done' ? (
              <><Check className="h-4 w-4" /> PDF baixado!</>
            ) : pdfState === 'working' ? (
              <>Gerando PDF…</>
            ) : (
              <><Download className="h-4 w-4" /> Baixar PDF completo</>
            )}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>Agora não</Button>
        </div>
      </div>
    </div>
  );
}
