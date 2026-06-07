import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles, TrendingUp, Upload, ArrowRight, CheckCircle2, Circle, Zap } from 'lucide-react';
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

function EmptyDashboard({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      {/* Hero welcome */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            Copiloto Financeiro IA
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Olá{name ? `, ${name}` : ''}! Vamos começar? 👋
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mb-6">
            Importe seu extrato bancário e em segundos o Copiloto analisa seus gastos, identifica padrões e começa a te guiar rumo à liberdade financeira.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="rounded-xl gap-2">
              <Link to="/upload">
                <Upload className="h-4 w-4" />
                Importar meu primeiro extrato
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
              <Link to="/debts">
                Adicionar dívida manualmente
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Como funciona */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { step: '1', icon: '📤', title: 'Importe seu extrato', desc: 'CSV, Excel ou PDF do seu banco. Funciona com Nubank, Itaú, Bradesco, BB e mais 5 bancos.' },
          { step: '2', icon: '🤖', title: 'IA categoriza tudo', desc: 'Alimentação, transporte, lazer... o Copiloto organiza automaticamente em segundos.' },
          { step: '3', icon: '🎯', title: 'Receba seu plano', desc: 'Com base na sua fase financeira, o Copiloto gera tarefas diárias e insights personalizados.' },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border bg-card p-5">
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
    return <EmptyDashboard name={profile?.name} />;
  }

  return (
    <div className="space-y-5">
      {/* Hero: Fase + Saldo */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Saldo do mês */}
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

        {/* Fase financeira */}
        {phase ? (
          <div className={cn(
            'rounded-2xl border p-5 flex flex-col justify-between',
            PHASE_COLORS[phase]
          )}>
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
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ⏱ {t.estimatedTime}
                    {t.estimatedReturn && ` · 💰 ${t.estimatedReturn}`}
                  </p>
                </div>
                <Circle className="h-5 w-5 shrink-0 ml-auto text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Regras + Metas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Regras automáticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatBRL(redirectedThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              redirecionados automaticamente · {rules.filter((r) => r.isActive).length} regra(s) ativa(s)
            </p>
            {rules.length === 0 && (
              <Link to="/rules" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Criar minha primeira regra <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Progresso das metas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Nenhuma meta criada ainda.</p>
                <Link to="/goals" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Criar primeira meta <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              goals.slice(0, 3).map((g) => {
                const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[70%]">{g.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {pct >= 100 && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        <span className={cn('text-xs', pct >= 100 ? 'text-success font-semibold' : 'text-muted-foreground')}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          pct >= 100 ? 'bg-success' : pct > 50 ? 'bg-primary' : 'bg-primary/60'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

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
  );
}
