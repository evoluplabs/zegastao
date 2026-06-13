import { useState, useMemo } from 'react';
import { Flame, TrendingUp, Target, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '@/store/useStore';
import { useDebts } from '@/hooks/useDebts';
import { useInvestments } from '@/hooks/useJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput, PercentInput } from '@/components/ui/CurrencyInput';
import { Disclaimer } from '@/components/Disclaimer';
import { formatBRL } from '@/lib/utils';
import { calcFire } from '@/lib/fire';

function formatK(n: number): string {
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}K`;
  return formatBRL(n);
}

const PHASE_LABELS: Record<string, string> = {
  survival: '🔴 Equilibrando',
  saving: '🟡 Poupando',
  on_track: '🔵 No caminho',
  close: '🟢 Quase lá!',
  achieved: '✅ Liberdade próxima!',
};

export function Fire() {
  const profile = useStore((s) => s.profile);
  const { data: debts } = useDebts();
  const { data: investments } = useInvestments();

  const totalInvested = investments.reduce((s, i) => s + (i.currentValue || i.amount), 0);
  const totalDebts = debts
    .filter((d) => d.status === 'active')
    .reduce((s, d) => s + d.totalBalance, 0);
  const netAssets = Math.max(0, totalInvested - totalDebts);

  const [monthlyIncome, setMonthlyIncome] = useState<number>(profile?.monthlyIncome || 0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(profile?.fixedExpenses || 0);
  const [currentAssets, setCurrentAssets] = useState<number>(netAssets || 0);
  const [annualReturn, setAnnualReturn] = useState<number>(0.10);
  const [inflation, setInflation] = useState<number>(0.05);

  const result = useMemo(() => {
    if (!monthlyIncome || !monthlyExpenses) return null;
    return calcFire({
      monthlyIncome,
      monthlyExpenses,
      currentAssets: currentAssets || 0,
      annualReturnPct: annualReturn * 100,
      inflationPct: inflation * 100,
    });
  }, [monthlyIncome, monthlyExpenses, currentAssets, annualReturn, inflation]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="rounded-xl bg-orange-100 dark:bg-orange-500/10 p-2.5">
          <Flame className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="font-bold text-base">Simulador de Liberdade Financeira</h2>
          <p className="text-xs text-muted-foreground">Regra dos 4% · Método FIRE</p>
        </div>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Seus dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <CurrencyInput label="Renda mensal (R$)" value={monthlyIncome} onChange={setMonthlyIncome} />
          <CurrencyInput label="Gastos mensais (R$)" value={monthlyExpenses} onChange={setMonthlyExpenses} />
          <div className="space-y-1.5">
            <CurrencyInput label="Patrimônio atual (R$)" value={currentAssets} onChange={setCurrentAssets} />
            <p className="text-[11px] text-muted-foreground">Investimentos menos dívidas: {formatBRL(netAssets)}</p>
          </div>
          <div className="space-y-1.5">
            <PercentInput label="Retorno anual esperado (%)" value={annualReturn} onChange={setAnnualReturn} />
            <p className="text-[11px] text-muted-foreground">Média histórica do mercado: ~10% a.a.</p>
          </div>
          <div className="space-y-1.5">
            <PercentInput label="Inflação anual (%)" value={inflation} onChange={setInflation} />
            <p className="text-[11px] text-muted-foreground">Meta do IPCA: ~4–5% ao ano</p>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result ? (
        <>
          {/* Cards de resultado */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Meta FIRE</p>
                <p className="text-2xl font-black">{formatK(result.targetAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((result.targetAmount / 12))} × 12 meses × 25
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {result.yearsToFire !== null ? 'Tempo estimado' : 'Situação atual'}
                </p>
                {result.yearsToFire !== null ? (
                  <>
                    <p className="text-2xl font-black">
                      {result.yearsToFire < 1
                        ? `${result.monthsToFire} meses`
                        : `${result.yearsToFire.toFixed(1)} anos`}
                    </p>
                    <p className="text-xs text-muted-foreground">{PHASE_LABELS[result.firePhase]}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-black">∞</p>
                    <p className="text-xs text-destructive">Gastos excedem a renda</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Poupando por mês</p>
                <p className="text-2xl font-black text-success">{formatBRL(result.monthlySavings)}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(result.savingsRate * 100)}% da renda
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Renda passiva hoje</p>
                <p className="text-2xl font-black text-primary">{formatBRL(result.passiveIncomeNow)}</p>
                <p className="text-xs text-muted-foreground">do patrimônio atual/mês (taxa real)</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de evolução */}
          {result.chart.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Evolução patrimonial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={result.chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${v}a`}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => formatK(v)}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatBRL(v), 'Patrimônio']}
                      labelFormatter={(l) => `Ano ${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#fireGrad)"
                    />
                    {/* Linha da meta */}
                    {/* Nota: uma linha de referência customizada pode ser adicionada via ReferenceLine */}
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground text-center mt-1">
                  Meta FIRE: {formatK(result.targetAmount)} · Linha pontilhada = patrimônio livre de dívidas
                </p>
              </CardContent>
            </Card>
          )}

          {/* Nota motivacional */}
          <div className="rounded-xl border border-orange-200/50 bg-orange-50 dark:bg-orange-500/5 dark:border-orange-500/20 p-4 flex items-start gap-3">
            <Zap className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-400">
                {PHASE_LABELS[result.firePhase]}
              </p>
              <p className="text-xs text-orange-700/80 dark:text-orange-400/70 mt-0.5">
                {result.motivationalNote}
              </p>
            </div>
          </div>

          {/* Dica de aceleração */}
          {result.monthlySavings > 0 && result.yearsToFire !== null && result.yearsToFire > 1 && (() => {
            const fasterResult = calcFire({
              monthlyIncome,
              monthlyExpenses,
              currentAssets: currentAssets || 0,
              annualReturnPct: annualReturn * 100,
              inflationPct: inflation * 100,
            });
            const extra100 = calcFire({
              monthlyIncome: monthlyIncome + 100,
              monthlyExpenses,
              currentAssets: currentAssets || 0,
              annualReturnPct: annualReturn * 100,
              inflationPct: inflation * 100,
            });
            const saved = fasterResult.yearsToFire !== null && extra100.yearsToFire !== null
              ? fasterResult.yearsToFire - extra100.yearsToFire
              : 0;
            if (saved <= 0.1) return null;
            return (
              <div className="rounded-xl border bg-secondary/30 p-3 flex items-start gap-2 text-xs">
                <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p>
                  <span className="font-semibold">Poupar R$100 a mais por mês</span> anteciparia sua liberdade em{' '}
                  <span className="font-semibold text-primary">{saved.toFixed(1)} anos</span>.
                </p>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="rounded-xl border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
          Preencha renda e gastos para ver sua projeção de liberdade financeira.
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
