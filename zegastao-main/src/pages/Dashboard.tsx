import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, TrendingUp, Upload, ArrowRight, Plus, Zap, TrendingDown, Target } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useRules } from '@/hooks/useRules';
import { useInsights } from '@/hooks/useInsights';
import { useDailyTasks } from '@/hooks/useJourney';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlowChart } from '@/components/charts/FlowChart';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { GoalWizard } from '@/components/flows/GoalWizard';
import { TransactionWizard } from '@/components/flows/TransactionWizard';
import { FinancialSetupWizard } from '@/components/flows/FinancialSetupWizard';
import { ProfileCompletionRing } from '@/components/ProfileCompletionRing';
import { ShareWinBanner } from '@/components/share/ShareWinBanner';
import { FinancialDiagnostic } from '@/components/FinancialDiagnostic';
import { CategoryAnalysis } from '@/components/CategoryAnalysis';
import { WeeklyChallenge } from '@/components/WeeklyChallenge';
import { FinancialSimulator } from '@/components/FinancialSimulator';
import { RecurringExpenses } from '@/components/RecurringExpenses';
import { SetupChecklist } from '@/components/SetupChecklist';
import { SpendingAlert } from '@/components/SpendingAlert';
import { MonthlyReport, shouldShowMonthlyReport } from '@/components/MonthlyReport';
import { deriveWins } from '@/lib/wins';
import { formatBRL, currentMonthStart } from '@/lib/utils';
import { PHASE_LABELS, type FinancialPhase } from '@/types';
import { cn } from '@/lib/utils';

const PHASE_COLORS: Record<FinancialPhase, string> = {
  survival: 'bg-destructive/10 text-destructive border-destructive/20',
  reorganizing: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  stabilizing: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  accumulating: 'bg-primary/10 text-primary border-primary/20',
  growing: 'bg-success/10 text-success border-success/20',
};

const PHASE_DESCRIPTIONS: Record<FinancialPhase, string> = {
  survival: 'Foco: cortar gastos e parar de afundar',
  reorganizing: 'Foco: pagar dívidas pela taxa de juros',
  stabilizing: 'Foco: construir reserva de emergência',
  accumulating: 'Foco: investir consistentemente',
  growing: 'Foco: escalar patrimônio e renda passiva',
};

const TASK_CATEGORY_ICONS: Record<string, string> = {
  renda_extra: '💰',
  economia: '✂️',
  aprendizado: '📚',
  investimento: '📈',
};

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 animate-pulse', className)}>
      <div className="h-4 w-32 rounded bg-muted mb-4" />
      <div className="h-8 w-24 rounded bg-muted mb-2" />
      <div className="h-3 w-48 rounded bg-muted" />
    </div>
  );
}

export function Dashboard() {
  const profile = useStore((s) => s.profile);
  // Load ALL transactions (not month-filtered) — month filter applied locally below
  const { data: allTransactions, loading: txLoading } = useTransactions(false);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: rules } = useRules();
  const { insights } = useInsights();
  const tasks = useDailyTasks();

  const [openDebt, setOpenDebt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [openTx, setOpenTx] = useState(false);
  const [openSetup, setOpenSetup] = useState(false);
  const [openSimulator, setOpenSimulator] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(() => shouldShowMonthlyReport());

  const income = profile?.monthlyIncome || 0;
  const phase = profile?.financialPhase;

  const monthStart = currentMonthStart();

  // Início do mês anterior para calcular queda de categoria
  const prevMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
  }, []);

  // Transactions for current month (for balance/expenses)
  const currentMonthTx = useMemo(
    () => allTransactions.filter((t) => t.date >= monthStart),
    [allTransactions, monthStart]
  );

  // Transactions for previous month
  const prevMonthTx = useMemo(
    () => allTransactions.filter((t) => t.date >= prevMonthStart && t.date < monthStart),
    [allTransactions, prevMonthStart, monthStart]
  );

  const { expenses, byCategory, debtPayments } = useMemo(() => {
    let expenses = 0;
    const map: Record<string, number> = {};
    for (const t of currentMonthTx) {
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
  }, [currentMonthTx, debts]);

  // Categorias do mês anterior (para calcular queda)
  const prevByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of prevMonthTx) {
      if (t.amount < 0) {
        const abs = Math.abs(t.amount);
        map[t.category] = (map[t.category] || 0) + abs;
      }
    }
    return map;
  }, [prevMonthTx]);

  // Queda na maior categoria de gasto vs mês anterior
  const topCategoryDropPct = useMemo(() => {
    if (!byCategory.length || !prevMonthTx.length) return undefined;
    const top = byCategory[0];
    const prevAmount = prevByCategory[top.name] || 0;
    if (prevAmount === 0) return undefined;
    const drop = ((prevAmount - top.amount) / prevAmount) * 100;
    return drop >= 15 ? Math.round(drop) : undefined;
  }, [byCategory, prevByCategory, prevMonthTx.length]);

  // Use fixed expenses from profile if no transaction data yet for this month
  const effectiveExpenses = expenses > 0 ? expenses : (profile?.fixedExpenses || 0);

  const balance = income - expenses;
  const redirectedThisMonth = rules.reduce((s, r) => s + (r.monthRedirected || 0), 0);

  const topDebt = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly)[0];

  const topGoal = [...goals]
    .filter((g) => g.status === 'active')
    .sort((a, b) => (b.currentAmount / (b.targetAmount || 1)) - (a.currentAmount / (a.targetAmount || 1)))[0];

  const wins = deriveWins({ balance, topGoal, redirectedThisMonth, topCategoryDropPct });

  // Categorias over-budget para WeeklyChallenge
  const overBudgetCategories = useMemo(() => {
    const BENCH: Record<string, number> = {
      'Delivery': 8, 'Restaurantes': 8, 'Transporte app': 5, 'Lazer': 10, 'Streaming': 3, 'Beleza': 5, 'Vestuário': 5,
    };
    return byCategory
      .map((c) => ({ ...c, pct: income > 0 ? (c.amount / income) * 100 : 0, ideal: BENCH[c.name] || 0 }))
      .filter((c) => c.ideal > 0 && c.pct > c.ideal * 1.1);
  }, [byCategory, income]);

  const hasAnyData = income > 0 || debts.length > 0 || allTransactions.length > 0 || goals.length > 0;
  const hasCurrentMonthTx = currentMonthTx.length > 0;
  const hasAnyTx = allTransactions.length > 0;

  if (txLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  // Show setup prompt only if truly no data at all
  if (!hasAnyData && !txLoading) {
    return (
      <>
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
                <Sparkles className="h-3 w-3" />
                Copiloto Financeiro IA
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Olá{profile?.name ? `, ${profile.name}` : ''}! Vamos montar seu plano? 👋
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mb-5">
                Para o Copiloto te ajudar de verdade, ele precisa conhecer sua situação. Leva menos de 3 minutos.
              </p>
              <Button size="lg" className="rounded-xl gap-2" onClick={() => setOpenSetup(true)}>
                <Sparkles className="h-4 w-4" />
                Configurar minha situação financeira
              </Button>
            </div>
          </div>
        </div>
        {openSetup && <FinancialSetupWizard onClose={() => setOpenSetup(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* 1. Checklist de ativação (aparece até o usuário completar os 5 passos) */}
        <SetupChecklist
          hasIncome={income > 0}
          hasDebts={debts.filter((d) => d.status === 'active').length > 0}
          hasUpload={allTransactions.length > 0}
          hasGoals={goals.filter((g) => g.status === 'active').length > 0}
        />

        {/* 2. Anel de progresso do perfil */}
        <ProfileCompletionRing
          profile={profile}
          debts={debts}
          goals={goals}
          transactions={allTransactions}
          onSetupWizard={() => setOpenSetup(true)}
        />

        {/* Alerta de gastos não-essenciais acima de 30% da renda */}
        <SpendingAlert income={income} byCategory={byCategory} />

        {/* 2. Diagnóstico financeiro — hero da página */}
        <FinancialDiagnostic
          income={income}
          expenses={effectiveExpenses}
          debts={debts}
          goals={goals}
        />

        {/* 3. Hero: Saldo + Fase */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 rounded-2xl border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              {hasCurrentMonthTx ? 'Saldo este mês' : 'Estimativa do mês'}
            </p>
            <p className={cn(
              'text-4xl font-bold tracking-tight',
              income === 0 ? 'text-muted-foreground' : balance >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {income === 0 ? '—' : formatBRL(balance)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                Renda <span className="font-semibold text-success">{income > 0 ? formatBRL(income) : '—'}</span>
              </span>
              <span className="text-muted-foreground">
                Gastos <span className="font-semibold">{effectiveExpenses > 0 ? formatBRL(effectiveExpenses) : '—'}</span>
              </span>
              {debtPayments > 0 && (
                <span className="text-muted-foreground">
                  Parcelas <span className="font-semibold text-amber-600">{formatBRL(debtPayments)}</span>
                </span>
              )}
            </div>
            {!hasCurrentMonthTx && hasAnyTx && (
              <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5">
                Transações de meses anteriores encontradas. Importe o extrato atual para ver o saldo deste mês.
              </p>
            )}
            {!hasCurrentMonthTx && !hasAnyTx && income > 0 && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Importe seu extrato bancário para ver gastos reais deste mês.
              </p>
            )}
            {hasCurrentMonthTx && balance < 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Você gastou mais do que ganhou. O Copiloto pode ajudar a reverter isso.
              </div>
            )}
          </div>

          {phase ? (
            <div className={cn('rounded-2xl border p-4 flex flex-col justify-between', PHASE_COLORS[phase])}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">Sua fase</p>
                <p className="text-lg font-bold">{PHASE_LABELS[phase]}</p>
                <p className="text-xs mt-1 opacity-70 leading-relaxed">{PHASE_DESCRIPTIONS[phase]}</p>
              </div>
              <Link to="/journey" className="mt-3 inline-flex items-center gap-1 text-xs font-medium opacity-80 hover:opacity-100">
                Ver trilha <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-4 flex flex-col items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Fase financeira</p>
                <p className="text-sm font-semibold">Calculando…</p>
                <p className="text-xs text-muted-foreground mt-1">Análise gerada à meia-noite</p>
              </div>
              <Link to="/journey" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Ver jornada <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Mini-vitória */}
        <ShareWinBanner wins={wins} />

        {/* 4. Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setOpenDebt(true)}>
            <Plus className="h-3.5 w-3.5" /> Dívida
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setOpenGoal(true)}>
            <Plus className="h-3.5 w-3.5" /> Meta
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setOpenTx(true)}>
            <Plus className="h-3.5 w-3.5" /> Transação
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" asChild>
            <Link to="/upload">
              <Upload className="h-3.5 w-3.5" /> Importar extrato
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full border-amber-400/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            onClick={() => setOpenSimulator(true)}
          >
            <Zap className="h-3.5 w-3.5" /> E se eu…
          </Button>
        </div>

        {/* 5. CTA de importação quando não tem transações */}
        {!hasAnyTx && income > 0 && (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Desbloqueie a análise completa</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Importe o extrato do seu banco para ver gastos reais, análise por categoria e insights personalizados.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" asChild>
              <Link to="/upload">
                <Upload className="h-3.5 w-3.5" /> Importar extrato
              </Link>
            </Button>
          </div>
        )}

        {/* 6. Tarefas de hoje */}
        {tasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Ações de hoje
              </h2>
              <Link to="/journey" className="text-xs text-muted-foreground hover:text-foreground">
                ver todas →
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {tasks.slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 transition-all">
                  <span className="text-xl shrink-0">{TASK_CATEGORY_ICONS[t.category] || '⚡'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-snug">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ⏱ {t.estimatedTime}
                      {t.estimatedReturn && ` · 💰 ${t.estimatedReturn}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Dívida + Meta */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-destructive" /> Dívida prioritária
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setOpenDebt(true)}>
                <Plus className="h-3.5 w-3.5" /> Nova
              </Button>
            </CardHeader>
            <CardContent>
              {topDebt ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold truncate">{topDebt.creditor}</p>
                    <span className="text-xs text-destructive font-semibold shrink-0">
                      {(topDebt.interestRateMonthly * 100).toFixed(1)}% a.m.
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{formatBRL(topDebt.totalBalance)}</p>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-destructive/60 w-full" />
                  </div>
                  <Link to="/financas?tab=debts" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma dívida cadastrada.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpenDebt(true)}>
                    <Plus className="h-3.5 w-3.5" /> Cadastrar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Meta mais próxima
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setOpenGoal(true)}>
                <Plus className="h-3.5 w-3.5" /> Nova
              </Button>
            </CardHeader>
            <CardContent>
              {topGoal ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold truncate">{topGoal.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {Math.min(100, (topGoal.currentAmount / (topGoal.targetAmount || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(100, (topGoal.currentAmount / (topGoal.targetAmount || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatBRL(topGoal.currentAmount)}</span>
                    <span>{formatBRL(topGoal.targetAmount)}</span>
                  </div>
                  <Link to="/financas?tab=goals" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma meta criada ainda.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpenGoal(true)}>
                    <Plus className="h-3.5 w-3.5" /> Criar meta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 8. Análise de gastos (só com transações) */}
        {(byCategory.length > 0 || hasCurrentMonthTx) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Fluxo do mês</CardTitle>
              </CardHeader>
              <CardContent>
                <FlowChart
                  data={[
                    { label: 'Renda', value: income, color: '#10b981' },
                    { label: 'Gastos', value: expenses, color: '#ef4444' },
                    { label: 'Parcelas', value: debtPayments, color: '#f59e0b' },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Análise por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {byCategory.length > 0 ? (
                  <div className="space-y-3">
                    <CategoryBreakdown data={byCategory.slice(0, 5)} />
                    <CategoryAnalysis
                      categories={byCategory.slice(0, 6)}
                      income={income}
                      transactions={currentMonthTx}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem gastos registrados este mês.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desafio semanal — aparece quando há categoria acima do ideal */}
        {overBudgetCategories.length > 0 && (
          <WeeklyChallenge
            overBudgetCategories={overBudgetCategories}
            currentMonthTx={currentMonthTx}
          />
        )}

        {/* Gastos recorrentes detectados */}
        {allTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Assinaturas e recorrentes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringExpenses transactions={allTransactions} />
            </CardContent>
          </Card>
        )}

        {/* Aviso quando tem transações antigas mas não deste mês */}
        {hasAnyTx && !hasCurrentMonthTx && (
          <div className="rounded-xl border bg-secondary/40 px-4 py-3 flex items-start gap-3 text-xs">
            <span className="text-lg shrink-0">📅</span>
            <div>
              <p className="font-medium">Transações de meses anteriores encontradas</p>
              <p className="text-muted-foreground mt-0.5">
                Você tem {allTransactions.length} transação{allTransactions.length !== 1 ? 'ões' : ''} no histórico.{' '}
                <Link to="/upload" className="text-primary underline">Importe o extrato de junho</Link> para ver o mês atual.
              </p>
            </div>
          </div>
        )}

        {/* 9. Regras automáticas */}
        {rules.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Regras automáticas
              </CardTitle>
              <Link to="/financas?tab=rules" className="text-xs text-muted-foreground hover:text-foreground">
                gerenciar →
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{formatBRL(redirectedThisMonth)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                redirecionados automaticamente · {rules.filter((r) => r.isActive).length} regra(s) ativa(s)
              </p>
            </CardContent>
          </Card>
        )}

        {/* 10. Insights do copiloto */}
        {insights.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insights do copiloto
              </h2>
              <Badge variant="outline" className="text-xs">Atualiza à meia-noite</Badge>
            </div>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="rounded-xl border bg-card p-4 hover:border-primary/20 transition-all">
                  <div className="flex items-start gap-3">
                    {ins.emoji && <span className="text-xl shrink-0">{ins.emoji}</span>}
                    <div>
                      <p className="font-semibold text-sm">{ins.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights empty state */}
        {insights.length === 0 && hasAnyTx && (
          <div className="rounded-xl border bg-card/50 p-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Insights personalizados aparecem após o primeiro processamento noturno.
            </p>
          </div>
        )}
      </div>

      {/* Wizards */}
      {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
      {openGoal && <GoalWizard onClose={() => setOpenGoal(false)} />}
      {openTx && <TransactionWizard onClose={() => setOpenTx(false)} />}
      {openSetup && <FinancialSetupWizard onClose={() => setOpenSetup(false)} />}
      {openSimulator && (
        <FinancialSimulator
          income={income}
          expenses={effectiveExpenses}
          debts={debts}
          onClose={() => setOpenSimulator(false)}
        />
      )}

      {/* Relatório mensal compartilhável — primeira semana do mês, se houver dados do mês anterior */}
      {showMonthlyReport && prevMonthTx.length > 0 && (
        <MonthlyReport
          transactions={prevMonthTx}
          goals={goals}
          monthLabel={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
            .toLocaleDateString('pt-BR', { month: 'long' })}
          onClose={() => setShowMonthlyReport(false)}
        />
      )}
    </>
  );
}
