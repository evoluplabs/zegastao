import { useMemo } from 'react';
import { AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useRules } from '@/hooks/useRules';
import { useInsights } from '@/hooks/useInsights';
import { useDailyTasks } from '@/hooks/useJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlowChart } from '@/components/charts/FlowChart';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { formatBRL } from '@/lib/utils';
import { PHASE_LABELS } from '@/types';

export function Dashboard() {
  const profile = useStore((s) => s.profile);
  const { data: transactions } = useTransactions(true);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: rules } = useRules();
  const { insights } = useInsights();
  const tasks = useDailyTasks();

  const income = profile?.monthlyIncome || 0;
  const phase = profile?.financialPhase;

  const { expenses, byCategory, debtPayments } = useMemo(() => {
    let expenses = 0;
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0) {
        const abs = Math.abs(t.amount);
        expenses += abs;
        map[t.category] = (map[t.category] || 0) + abs;
      }
    }
    const byCategory = Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const debtPayments = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
    return { expenses, byCategory, debtPayments };
  }, [transactions, debts]);

  const balance = income - expenses;
  const redirectedThisMonth = rules.reduce((s, r) => s + (r.monthRedirected || 0), 0);

  return (
    <div className="space-y-4">
      {/* Fase financeira atual — guia o tom e o foco do app */}
      {phase && (
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
          <span className="text-sm text-muted-foreground">Sua fase agora</span>
          <Badge variant="success">{PHASE_LABELS[phase]}</Badge>
        </div>
      )}

      {/* Ações de hoje (tarefas geradas pelo copiloto) */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚡ Ações de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.slice(0, 2).map((t, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  ⏱ {t.estimatedTime}
                  {t.estimatedReturn ? ` · 💰 ${t.estimatedReturn}` : ''}
                  {t.platform ? ` · ${t.platform}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 1. Alerta de saldo */}
      {balance < 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Saldo negativo este mês</p>
              <p className="text-sm text-muted-foreground">
                Você gastou {formatBRL(expenses)} de {formatBRL(income)}. Bora ajustar?
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Fluxo do mês */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <FlowChart
              data={[
                { label: 'Renda', value: income, color: '#10b981' },
                { label: 'Gastos', value: expenses, color: '#ef4444' },
                { label: 'Dívidas', value: debtPayments, color: '#f59e0b' },
              ]}
            />
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo estimado</span>
              <span className={balance >= 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                {formatBRL(balance)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Top categorias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Para onde foi o dinheiro</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown data={byCategory.slice(0, 6)} />
            <ul className="mt-3 space-y-1 text-sm">
              {byCategory.slice(0, 5).map((c) => (
                <li key={c.name} className="flex justify-between">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span>
                    {formatBRL(c.amount)}{' '}
                    {income > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({((c.amount / income) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 4. Regras em ação + 5. Metas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Regras em ação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatBRL(redirectedThisMonth)}</p>
            <p className="text-sm text-muted-foreground">
              redirecionados para suas metas este mês por {rules.filter((r) => r.isActive).length} regra(s) ativa(s).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso das metas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">Crie sua primeira meta na aba Metas.</p>
            )}
            {goals.slice(0, 3).map((g) => {
              const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 6. Insights do copiloto (lidos do Firestore — sem chamada de IA) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Insights do copiloto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Seus insights aparecem aqui depois do primeiro processamento noturno.
            </p>
          )}
          {insights.map((ins, i) => (
            <div key={i} className="rounded-md border p-3">
              <p className="font-medium">
                {ins.emoji && <span className="mr-1">{ins.emoji}</span>}
                {ins.title}
              </p>
              <p className="text-sm text-muted-foreground">{ins.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
