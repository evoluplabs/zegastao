import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, TrendingUp, Upload, ArrowRight, Plus, Zap } from 'lucide-react';
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
import { ProfileCompletion } from '@/components/ProfileCompletion';
import { ShareWinBanner } from '@/components/share/ShareWinBanner';
import { deriveWins } from '@/lib/wins';
import { formatBRL } from '@/lib/utils';
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

function EmptyDashboard({
  name,
  onDebt,
  onTransaction,
  onSetupWizard,
  debtCount,
  income,
}: {
  name?: string;
  onDebt: () => void;
  onTransaction: () => void;
  onSetupWizard: () => void;
  debtCount: number;
  income: number;
}) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            Copiloto Financeiro IA
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Olá{name ? `, ${name}` : ''}! Vamos montar seu plano? 👋
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mb-5">
            Para o Copiloto te ajudar de verdade, ele precisa conhecer sua situação. Leva menos de 3 minutos.
          </p>
          <Button size="lg" className="rounded-xl gap-2" onClick={onSetupWizard}>
            <Sparkles className="h-4 w-4" />
            Configurar minha situação financeira
          </Button>
        </div>
      </div>

      {/* O que já foi preenchido */}
      {(debtCount > 0 || income > 0) && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Já cadastrado</p>
          <div className="flex flex-wrap gap-3">
            {income > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                ✓ Renda: <strong>{formatBRL(income)}/mês</strong>
              </div>
            )}
            {debtCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ✓ {debtCount} dívida{debtCount > 1 ? 's' : ''} cadastrada{debtCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outras ações */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
          <Link to="/upload">
            <Upload className="h-3.5 w-3.5" /> Importar extrato
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={onDebt}>
          <Plus className="h-3.5 w-3.5" /> Adicionar dívida
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={onTransaction}>
          <Plus className="h-3.5 w-3.5" /> Lançar transação
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: '📤', title: 'Importe seu extrato', desc: 'CSV ou PDF do seu banco. Nubank, Itaú, Bradesco, BB e mais.' },
          { icon: '🤖', title: 'IA categoriza tudo', desc: 'Alimentação, transporte, lazer — organizado em segundos.' },
          { icon: '🎯', title: 'Receba seu plano', desc: 'Tarefas diárias e insights personalizados para sua fase.' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-5">
            <div className="text-2xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const profile = useStore((s) => s.profile);
  const { data: transactions, loading: txLoading } = useTransactions(true);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: rules } = useRules();
  const { insights } = useInsights();
  const tasks = useDailyTasks();

  const [openDebt, setOpenDebt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [openTx, setOpenTx] = useState(false);
  const [openSetup, setOpenSetup] = useState(false);

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

  // Dívida de maior juro (destaque no dashboard)
  const topDebt = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly)[0];

  // Meta mais próxima de 100%
  const topGoal = [...goals]
    .filter((g) => g.status === 'active')
    .sort((a, b) => (b.currentAmount / (b.targetAmount || 1)) - (a.currentAmount / (a.targetAmount || 1)))[0];

  // Mini-vitórias compartilháveis (alavanca de crescimento orgânico)
  const wins = deriveWins({ balance, topGoal, redirectedThisMonth });

  if (txLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (transactions.length === 0 && !txLoading) {
    return (
      <>
        <EmptyDashboard
          name={profile?.name}
          onDebt={() => setOpenDebt(true)}
          onTransaction={() => setOpenTx(true)}
          onSetupWizard={() => setOpenSetup(true)}
          debtCount={debts.length}
          income={income}
        />
        {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
        {openTx && <TransactionWizard onClose={() => setOpenTx(false)} />}
        {openSetup && <FinancialSetupWizard onClose={() => setOpenSetup(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Barra de progresso do perfil */}
        <ProfileCompletion
          profile={profile}
          debts={debts}
          goals={goals}
          transactions={transactions}
          onSetupWizard={() => setOpenSetup(true)}
        />

        {/* Mini-vitória compartilhável (crescimento orgânico) */}
        <ShareWinBanner wins={wins} />

        {/* Hero: Fase + Saldo */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-card p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Saldo estimado este mês</p>
            <p className={cn(
              'text-4xl font-bold tracking-tight',
              balance >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {formatBRL(balance)}
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-muted-foreground">
                Renda <span className="font-semibold text-success">{formatBRL(income)}</span>
              </span>
              <span className="text-muted-foreground">
                Gastos <span className="font-semibold text-destructive">{formatBRL(expenses)}</span>
              </span>
            </div>
            {balance < 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Você gastou mais do que ganhou. O Copiloto pode ajudar a reverter isso.
              </div>
            )}
          </div>

          {phase ? (
            <div className={cn('rounded-2xl border p-5 flex flex-col justify-between', PHASE_COLORS[phase])}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-2">Sua fase atual</p>
                <p className="text-xl font-bold">{PHASE_LABELS[phase]}</p>
                <p className="text-xs mt-1 opacity-70 leading-relaxed">{PHASE_DESCRIPTIONS[phase]}</p>
              </div>
              <Link to="/journey" className="mt-4 inline-flex items-center gap-1 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity">
                Ver trilha completa <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-5 flex items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">Fase calculada pelo copiloto à meia-noite</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setOpenDebt(true)}>
            <Plus className="h-3.5 w-3.5" /> Dívida
          </Button>
          <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setOpenGoal(true)}>
            <Plus className="h-3.5 w-3.5" /> Meta
          </Button>
          <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setOpenTx(true)}>
            <Plus className="h-3.5 w-3.5" /> Transação
          </Button>
          <Button size="sm" variant="outline" className="gap-2 rounded-full" asChild>
            <Link to="/transactions">
              <Upload className="h-3.5 w-3.5" /> Importar extrato
            </Link>
          </Button>
        </div>

        {/* Tarefas de hoje */}
        {tasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Ações de hoje
              </h2>
              <Link to="/journey" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ver todas →
              </Link>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {tasks.slice(0, 2).map((t, i) => (
                <div key={i} className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                  <span className="text-xl">{TASK_CATEGORY_ICONS[t.category] || '⚡'}</span>
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

        {/* Dívida + Meta em destaque */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Dívida prioritária</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setOpenDebt(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {topDebt ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold">{topDebt.creditor}</p>
                    <span className="text-xs text-destructive font-medium">
                      {(topDebt.interestRateMonthly * 100).toFixed(1)}% a.m.
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{formatBRL(topDebt.totalBalance)}</p>
                  <Link
                    to="/financas?tab=debts"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    Ver todas as dívidas <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma dívida cadastrada.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpenDebt(true)}>
                    <Plus className="h-3.5 w-3.5" /> Cadastrar dívida
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Meta mais próxima</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setOpenGoal(true)}>
                <Plus className="h-3.5 w-3.5" /> Criar
              </Button>
            </CardHeader>
            <CardContent>
              {topGoal ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold truncate max-w-[65%]">{topGoal.name}</p>
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
                  <Link
                    to="/financas?tab=goals"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    Ver todas as metas <ArrowRight className="h-3 w-3" />
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

        {/* Fluxo + Categorias */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Fluxo do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <FlowChart
                data={[
                  { label: 'Renda', value: income, color: '#10b981' },
                  { label: 'Gastos', value: expenses, color: '#ef4444' },
                  { label: 'Dívidas', value: debtPayments, color: '#f59e0b' },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Para onde foi o dinheiro</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length > 0 ? (
                <>
                  <CategoryBreakdown data={byCategory.slice(0, 6)} />
                  <ul className="mt-3 space-y-2 text-sm">
                    {byCategory.slice(0, 5).map((c) => (
                      <li key={c.name} className="flex items-center justify-between">
                        <span className="text-muted-foreground truncate max-w-[60%]">{c.name}</span>
                        <div className="text-right">
                          <span className="font-medium">{formatBRL(c.amount)}</span>
                          {income > 0 && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {((c.amount / income) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sem gastos registrados este mês.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Regras automáticas */}
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
            {rules.length === 0 && (
              <Link to="/financas?tab=rules" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Criar minha primeira regra <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Insights do copiloto */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights do copiloto
            </h2>
            <Badge variant="outline" className="text-xs">Atualiza à meia-noite</Badge>
          </div>
          {insights.length === 0 ? (
            <div className="rounded-xl border bg-card/50 p-6 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Seus insights personalizados aparecem aqui após o primeiro processamento noturno.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm">
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
          )}
        </div>
      </div>

      {/* Wizards */}
      {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
      {openGoal && <GoalWizard onClose={() => setOpenGoal(false)} />}
      {openTx && <TransactionWizard onClose={() => setOpenTx(false)} />}
      {openSetup && <FinancialSetupWizard onClose={() => setOpenSetup(false)} />}
    </>
  );
}
