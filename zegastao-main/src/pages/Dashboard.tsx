import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Sparkles, Upload, ArrowRight, Plus, Zap,
  Wallet, CalendarCheck2, Bell, ChevronRight, TrendingDown, Target,
  ChevronLeft, RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useCaixinhas } from '@/hooks/useCaixinhas';
import { getCaixinhaPlan } from '@/lib/caixinha';
import { useInsights } from '@/hooks/useInsights';
import { useAccounts } from '@/hooks/useAccounts';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import { usePartnerData } from '@/hooks/usePartnerData';
import { AccountWizard } from '@/components/flows/AccountWizard';
import type { Account } from '@/types';
import { Button } from '@/components/ui/button';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { GoalWizard } from '@/components/flows/GoalWizard';
import { TransactionWizard } from '@/components/flows/TransactionWizard';
import { FinancialSetupWizard } from '@/components/flows/FinancialSetupWizard';
import { FinancialSimulator } from '@/components/FinancialSimulator';
import { MonthlyReport, shouldShowMonthlyReport } from '@/components/MonthlyReport';
import { formatBRL, currentMonthStart } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isNeutral, computeBalance, currentMonthISO, shiftMonth, monthLabel } from '@/lib/finance';

const CATEGORY_EMOJI: Record<string, string> = {
  'Alimentação': '🍽️', 'Mercado': '🛒', 'Delivery': '🛵', 'Transporte': '🚗',
  'Uber / App': '📱', 'Moradia': '🏠', 'Aluguel': '🏠', 'Saúde': '💊',
  'Farmácia': '💊', 'Lazer': '🎬', 'Streaming': '📺', 'Educação': '📚',
  'Vestuário': '👕', 'Beleza': '💇', 'Pet': '🐾', 'Viagem': '✈️',
  'Academia': '🏋️', 'Combustível': '⛽', 'Energia': '💡', 'Telefone': '📱',
  'Internet': '🌐', 'Outros': '📦', 'Renda extra': '💰', 'Salário': '💼',
};

const CATEGORY_BENCHMARKS: Record<string, number> = {
  'Delivery': 8, 'Restaurantes': 8, 'Transporte app': 5, 'Lazer': 10,
  'Streaming': 3, 'Beleza': 5, 'Vestuário': 5,
};

function SkeletonHero() {
  return (
    <div className="rounded-3xl border bg-card p-5 animate-pulse space-y-3">
      <div className="h-3 w-28 rounded bg-muted" />
      <div className="h-9 w-40 rounded bg-muted" />
      <div className="h-px bg-muted" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const profile = useStore((s) => s.profile);
  const { data: allTransactions, loading: txLoading } = useTransactions(false);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: caixinhas } = useCaixinhas();
  const { insights } = useInsights();
  const { data: accounts } = useAccounts();
  const { isLinked } = useSharedFinances();
  const { data: partnerData } = usePartnerData();
  const navigate = useNavigate();

  const showCombined = useStore((s) => s.showCombined);

  const [searchParams, setSearchParams] = useSearchParams();
  const [openDebt, setOpenDebt] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [openGoal, setOpenGoal] = useState(false);
  const [openTx, setOpenTx] = useState(false);
  const [openSetup, setOpenSetup] = useState(false);
  const [openSimulator, setOpenSimulator] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(() => shouldShowMonthlyReport());
  const [showWelcome, setShowWelcome] = useState(() => searchParams.get('welcome') === '1');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  // ── Navegação de mês ──────────────────────────────────────────────────────
  const thisMonth = currentMonthISO();
  const [viewMonth, setViewMonth] = useState(thisMonth);
  const isCurrentMonth = viewMonth === thisMonth;

  function navMonth(dir: 1 | -1) {
    setViewMonth((prev) => shiftMonth(prev, dir));
  }

  const viewLabel = useMemo(() => monthLabel(viewMonth), [viewMonth]);

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const income = profile?.monthlyIncome || 0;

  // ── Filtro de transações por mês ──────────────────────────────────────────
  const monthTx = useMemo(
    () => allTransactions.filter((t) => (t.date || '').slice(0, 7) === viewMonth),
    [allTransactions, viewMonth]
  );

  const prevMonthTx = useMemo(() => {
    const prev = shiftMonth(viewMonth, -1);
    return allTransactions.filter((t) => (t.date || '').slice(0, 7) === prev);
  }, [allTransactions, viewMonth]);

  // ── Fluxo do mês (categorias neutras excluídas) ───────────────────────────
  // Neutras: Fatura cartão, Transferência — são movimentos internos, não receita/despesa real.
  const { actualIncome, expenses, byCategory } = useMemo(() => {
    let actualIncome = 0;
    let expenses = 0;
    const map: Record<string, number> = {};
    for (const t of monthTx) {
      if (isNeutral(t.category)) continue;
      if (t.amount > 0) {
        actualIncome += t.amount;
      } else {
        const abs = Math.abs(t.amount);
        expenses += abs;
        map[t.category] = (map[t.category] || 0) + abs;
      }
    }
    const byCategory = Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    return { actualIncome, expenses, byCategory };
  }, [monthTx]);

  const hasMonthTx = monthTx.length > 0;

  // ── Variação vs mês anterior ───────────────────────────────────────────────
  const prevExpenses = useMemo(
    () => prevMonthTx
      .filter((t) => t.amount < 0 && !isNeutral(t.category))
      .reduce((s, t) => s + Math.abs(t.amount), 0),
    [prevMonthTx]
  );
  const expensesDelta = prevExpenses > 0
    ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100)
    : null;

  // ── Modo casal ───────────────────────────────────────────────────────────
  const coupleActive = showCombined && isLinked && !!partnerData;
  // Dados do parceiro: apenas mês atual (limitação do usePartnerData)
  const partnerIncome = coupleActive ? (partnerData?.income ?? 0) : 0;
  const partnerExpenses = coupleActive ? (partnerData?.expenses ?? 0) : 0;

  const displayedIncome = actualIncome + partnerIncome;
  const displayedExpenses = expenses + partnerExpenses;
  const displayedBalance = displayedIncome - displayedExpenses;

  // ── Saldo total computado das contas ────────────────────────────────────
  // computeBalance usa account.balance (âncora reconciliada) + transações
  // com accountId vinculado desde balancedAt. Retrocompatível: contas sem
  // balancedAt exibem o balance estático como antes.
  const totalAccountBalance = useMemo(
    () => accounts.reduce((s, a) => s + computeBalance(a, allTransactions), 0),
    [accounts, allTransactions]
  );

  // ── Vencimentos ───────────────────────────────────────────────────────────
  const { overdue, dueSoon } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let overdue = 0, dueSoon = 0;
    for (const d of debts) {
      if (d.status !== 'active') continue;
      const dueThisMonth = new Date(year, month, d.dueDay);
      const daysThisMonth = Math.ceil((dueThisMonth.getTime() - now.getTime()) / 86_400_000);
      const daysUntil = daysThisMonth < -5
        ? Math.ceil((new Date(year, month + 1, d.dueDay).getTime() - now.getTime()) / 86_400_000)
        : daysThisMonth;
      if (daysUntil < 0) overdue += d.monthlyPayment;
      else if (daysUntil <= 7) dueSoon += d.monthlyPayment;
    }
    return { overdue, dueSoon };
  }, [debts]);

  const hasAnyData = income > 0 || debts.length > 0 || allTransactions.length > 0 || goals.length > 0;

  // ── Caixinhas com depósito pendente ───────────────────────────────────────
  const pendingCaixinha = caixinhas
    .filter((c) => c.status !== 'completed')
    .map((c) => ({ c, plan: getCaixinhaPlan(c) }))
    .find(({ plan }) => (plan.needsDepositToday || plan.needsDepositThisWeek) && plan.periodTarget > 0);

  if (txLoading) {
    return (
      <div className="space-y-4">
        <SkeletonHero />
        <div className="h-24 rounded-2xl border bg-card animate-pulse" />
        <div className="h-16 rounded-2xl border bg-card animate-pulse" />
      </div>
    );
  }

  if (!hasAnyData && !txLoading) {
    return (
      <>
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
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
              <Button size="lg" className="rounded-2xl gap-2" onClick={() => setOpenSetup(true)}>
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

        {/* Boas-vindas pós-onboarding */}
        {showWelcome && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Bem-vindo{profile?.name ? `, ${profile.name}` : ''}! Plano criado.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Importe seu extrato para o Copiloto analisar seus gastos reais.</p>
              <Button size="sm" className="mt-2 gap-1.5 h-8 text-xs rounded-xl" asChild>
                <Link to="/upload"><Upload className="h-3 w-3" /> Importar extrato</Link>
              </Button>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-muted-foreground/60 text-lg leading-none shrink-0 hover:text-foreground">×</button>
          </div>
        )}

        {/* ── 1. HERO ─────────────────────────────────────── */}
        <div className="rounded-3xl border bg-card overflow-hidden">

          {/* Patrimônio: saldo das contas */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patrimônio — saldo em contas
                </p>
                {accounts.length === 0 && (
                  <button
                    onClick={() => setOpenAccount(true)}
                    className="text-[10px] text-primary underline font-medium"
                  >
                    + adicionar
                  </button>
                )}
              </div>
              {accounts.length > 0 && (
                <button
                  onClick={() => setOpenAccount(true)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  {accounts.length} conta{accounts.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <p className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight tabular-nums truncate',
              totalAccountBalance >= 0 ? 'text-foreground' : 'text-destructive'
            )}>
              {accounts.length > 0 ? formatBRL(totalAccountBalance) : '—'}
            </p>
            {accounts.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Cadastre suas contas para ver o saldo real</p>
            )}
            {accounts.length > 0 && accounts.some((a) => !a.balancedAt) && (
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-1">
                Toque em <span className="font-semibold">reconciliar</span> em qualquer conta para manter o saldo atualizado automaticamente.
              </p>
            )}
          </div>

          {/* Divisor */}
          <div className="border-t mx-5" />

          {/* Navegação de mês */}
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={() => navMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-[11px] font-semibold capitalize text-muted-foreground">{viewLabel}</p>
            <button
              onClick={() => navMonth(1)}
              disabled={isCurrentMonth}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-default"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Fluxo do mês: Entradas / Saídas / Sobra */}
          <div className="grid grid-cols-3 divide-x border-t">
            <div className="min-w-0 px-3 py-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Entradas</p>
              <p className="text-sm font-bold text-success tabular-nums truncate">
                {displayedIncome > 0 ? formatBRL(displayedIncome) : '—'}
              </p>
              {!hasMonthTx && isCurrentMonth && (
                <p className="text-[9px] text-muted-foreground/60">sem dados</p>
              )}
            </div>
            <div className="min-w-0 px-3 py-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Saídas</p>
              <p className={cn(
                'text-sm font-bold tabular-nums truncate',
                displayedExpenses > 0 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {displayedExpenses > 0 ? formatBRL(displayedExpenses) : '—'}
              </p>
              {expensesDelta !== null && Math.abs(expensesDelta) >= 5 && (
                <p className={cn('text-[9px]', expensesDelta > 0 ? 'text-destructive' : 'text-success')}>
                  {expensesDelta > 0 ? '+' : ''}{expensesDelta}% vs anterior
                </p>
              )}
            </div>
            <div className="min-w-0 px-3 py-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Resultado</p>
              <p className={cn(
                'text-sm font-bold tabular-nums truncate',
                displayedBalance >= 0 ? 'text-foreground' : 'text-destructive'
              )}>
                {!hasMonthTx && !coupleActive ? '—' : formatBRL(displayedBalance)}
              </p>
              {displayedBalance < 0 && hasMonthTx && (
                <p className="text-[9px] text-destructive">Saiu mais do que entrou</p>
              )}
            </div>
          </div>

          {/* Simulador link */}
          <div className="border-t mx-5" />
          <button
            onClick={() => setOpenSimulator(true)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors"
          >
            <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> E se eu pagar a mais ou economizar?</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* CTA importar extrato quando sem transações no mês */}
        {!hasMonthTx && accounts.length > 0 && (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Nenhum lançamento em {viewLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCurrentMonth
                  ? 'Importe seu extrato ou lance transações para ver o fluxo real.'
                  : 'Sem dados importados para este mês.'}
              </p>
            </div>
            {isCurrentMonth && (
              <Button size="sm" className="gap-1.5 shrink-0 rounded-xl text-xs h-8" asChild>
                <Link to="/upload"><Upload className="h-3 w-3" /> Importar</Link>
              </Button>
            )}
          </div>
        )}

        {/* ── 2. CATEGORIAS (QUANDO HÁ TRANSAÇÕES) ──────── */}
        {(byCategory.length > 0 || hasMonthTx) && (
          <div className="rounded-3xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Onde está seu dinheiro</h2>
              <Link to="/transactions" className="text-xs text-primary font-medium">
                ver tudo →
              </Link>
            </div>

            {byCategory.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Nenhuma despesa real registrada.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Transferências e faturas de cartão são excluídas — não são despesas de consumo.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {(categoriesExpanded ? byCategory : byCategory.slice(0, 5)).map((cat) => {
                    const pct = displayedIncome > 0 ? (cat.amount / displayedIncome) * 100 : 0;
                    const benchmark = CATEGORY_BENCHMARKS[cat.name];
                    const isOver = benchmark && pct > benchmark * 1.1;
                    const emoji = CATEGORY_EMOJI[cat.name] || '📦';
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-base shrink-0 w-6 text-center">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium truncate">{cat.name}</p>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isOver && (
                                <span className="text-[9px] font-bold text-destructive bg-destructive/10 rounded px-1">acima</span>
                              )}
                              <p className="text-xs font-semibold tabular-nums">{formatBRL(cat.amount)}</p>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isOver ? 'bg-destructive' : 'bg-primary'
                              )}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                          {pct.toFixed(0)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
                {byCategory.length > 5 && (
                  <button
                    onClick={() => setCategoriesExpanded((v) => !v)}
                    className="mt-3 text-xs text-primary font-medium hover:underline w-full text-center"
                  >
                    {categoriesExpanded ? 'Ver menos ↑' : `+ ${byCategory.length - 5} categorias`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 3. ALERTAS URGENTES (CONDICIONAL) ──────────── */}
        {(overdue > 0 || dueSoon > 0) && (
          <div className="rounded-3xl border overflow-hidden">
            {overdue > 0 && (
              <Link
                to="/carteira"
                className="flex items-center gap-3 bg-destructive/5 border-b border-destructive/20 px-5 py-3.5 hover:bg-destructive/10 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive">Pagamentos em atraso</p>
                  <p className="text-xs text-destructive/70">{formatBRL(overdue)} em dívidas vencidas</p>
                </div>
                <ChevronRight className="h-4 w-4 text-destructive/50 shrink-0" />
              </Link>
            )}
            {dueSoon > 0 && (
              <Link
                to="/carteira"
                className="flex items-center gap-3 bg-amber-500/5 px-5 py-3.5 hover:bg-amber-500/10 transition-colors"
              >
                <CalendarCheck2 className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Vence nos próximos 7 dias</p>
                  <p className="text-xs text-amber-600/70">{formatBRL(dueSoon)} em parcelas</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500/50 shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* ── 4. AÇÕES RÁPIDAS ─────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Plus, label: 'Transação', onClick: () => setOpenTx(true), color: 'bg-primary/10 text-primary' },
            { icon: Upload, label: 'Importar', to: '/upload', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
            { icon: TrendingDown, label: 'Dívidas', to: '/carteira', color: 'bg-destructive/10 text-destructive' },
            { icon: Target, label: 'Metas', onClick: () => setOpenGoal(true), color: 'bg-success/10 text-success' },
          ].map((action) => {
            const content = (
              <>
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl mb-1', action.color)}>
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-center leading-tight">{action.label}</span>
              </>
            );
            if (action.to) {
              return (
                <Link key={action.label} to={action.to} className="flex flex-col items-center rounded-2xl border bg-card py-3 px-2 hover:border-primary/30 hover:bg-accent/50 transition-colors active:scale-95">
                  {content}
                </Link>
              );
            }
            return (
              <button key={action.label} onClick={action.onClick} className="flex flex-col items-center rounded-2xl border bg-card py-3 px-2 hover:border-primary/30 hover:bg-accent/50 transition-colors active:scale-95">
                {content}
              </button>
            );
          })}
        </div>

        {/* Lembrete da Caixinha */}
        {pendingCaixinha && (
          <Link
            to="/caixinha"
            className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors active:scale-[0.99]"
          >
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm flex-1 min-w-0">
              Hora de guardar <span className="font-semibold text-primary">{formatBRL(pendingCaixinha.plan.periodTarget)}</span>
              {' '}em {pendingCaixinha.c.emoji} {pendingCaixinha.c.name}
              {pendingCaixinha.plan.isWeekly ? ' (semana)' : ''}
            </span>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </Link>
        )}

        {/* ── 5. INSIGHT DO COPILOTO ────────────────────── */}
        {insights.length > 0 && (
          <div className="rounded-3xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insight do Copiloto
              </h2>
              <Link to="/copilot" className="text-xs text-primary font-medium">
                ver mais →
              </Link>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                {insights[0].emoji && <span className="text-2xl shrink-0">{insights[0].emoji}</span>}
                <div>
                  <p className="font-semibold text-sm">{insights[0].title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insights[0].body}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. CAIXINHAS ATIVAS ──────────────────────── */}
        {caixinhas.filter(c => c.status !== 'completed').length > 0 && (
          <div className="rounded-3xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
              <h2 className="text-sm font-semibold">Caixinhas</h2>
              <Link to="/caixinha" className="text-xs text-primary font-medium">
                gerenciar →
              </Link>
            </div>
            <div className="px-5 py-4 flex gap-3 overflow-x-auto no-scrollbar">
              {caixinhas.filter(c => c.status !== 'completed').map((c) => {
                const plan = getCaixinhaPlan(c);
                const pct = c.targetAmount > 0 ? Math.min(100, (c.totalSaved / c.targetAmount) * 100) : 0;
                return (
                  <Link
                    key={c.id}
                    to="/caixinha"
                    className="flex flex-col shrink-0 w-32 rounded-2xl border bg-background p-3 hover:border-primary/30 transition-colors"
                  >
                    <span className="text-2xl mb-1">{c.emoji}</span>
                    <p className="text-xs font-semibold truncate">{c.name}</p>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                    {(plan.needsDepositToday || plan.needsDepositThisWeek) && (
                      <p className="mt-0.5 text-[10px] font-semibold text-primary">
                        {plan.isWeekly ? 'Guardar semana' : 'Guardar hoje'}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA importar extrato quando sem transações e sem contas */}
        {allTransactions.length === 0 && income > 0 && accounts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Desbloqueie a análise completa</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Importe o extrato do seu banco para ver gastos reais e insights personalizados.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0 rounded-xl" asChild>
              <Link to="/upload"><Upload className="h-3.5 w-3.5" /> Importar</Link>
            </Button>
          </div>
        )}

        {/* Espaçamento para a bottom nav */}
        <div className="h-2" />
      </div>

      {/* Wizards */}
      {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
      {openGoal && <GoalWizard onClose={() => setOpenGoal(false)} />}
      {openTx && <TransactionWizard onClose={() => setOpenTx(false)} />}
      {openSetup && <FinancialSetupWizard onClose={() => setOpenSetup(false)} />}
      {openAccount && (
        <AccountWizard
          onClose={() => { setOpenAccount(false); setEditingAccount(undefined); }}
          existing={editingAccount}
        />
      )}
      {openSimulator && (
        <FinancialSimulator
          income={income}
          expenses={expenses}
          debts={debts}
          onClose={() => setOpenSimulator(false)}
        />
      )}

      {showMonthlyReport && prevMonthTx.length > 0 && (
        <MonthlyReport
          transactions={prevMonthTx}
          goals={goals}
          debts={debts}
          monthlyIncome={income}
          monthLabel={(() => {
            const prev = shiftMonth(thisMonth, -1);
            return monthLabel(prev);
          })()}
          onClose={() => setShowMonthlyReport(false)}
        />
      )}
    </>
  );
}
