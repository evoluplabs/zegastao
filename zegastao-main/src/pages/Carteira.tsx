import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Plus, Wallet, CreditCard as CreditCardIcon,
  TrendingDown, Target, TrendingUp, ArrowRight,
} from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useCaixinhas } from '@/hooks/useCaixinhas';
import { AccountWizard } from '@/components/flows/AccountWizard';
import { CreditCardWizard } from '@/components/flows/CreditCardWizard';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { GoalWizard } from '@/components/flows/GoalWizard';
import { Debts } from '@/pages/Debts';
import { Goals } from '@/pages/Goals';
import { Investments } from '@/pages/Investments';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import { CREDIT_CARD_BANKS } from '@/types';
import type { Account } from '@/types';
import { cn } from '@/lib/utils';

const SECTION_KEY = 'carteira_sections';

function loadSections(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SECTION_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSections(s: Record<string, boolean>) {
  localStorage.setItem(SECTION_KEY, JSON.stringify(s));
}

function Section({
  id, icon, title, badge, defaultOpen = true, children, onAdd, addLabel,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const stored = loadSections();
  const [open, setOpen] = useState(stored[id] !== undefined ? stored[id] : defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    saveSections({ ...loadSections(), [id]: next });
  }

  return (
    <div className="rounded-3xl border bg-card overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
        onClick={toggle}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">{title}</p>
            {badge && <p className="text-[10px] text-muted-foreground">{badge}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onAdd && open && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label={addLabel || 'Adicionar'}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

export function Carteira() {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: cards } = useCreditCards();
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: caixinhas } = useCaixinhas();

  const [openAccount, setOpenAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [openCard, setOpenCard] = useState(false);
  const [openDebt, setOpenDebt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalDebt = activeDebts.reduce((s, d) => s + d.totalBalance, 0);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const activeCaixinhas = caixinhas.filter((c) => c.status !== 'completed');

  return (
    <>
      <div className="space-y-4">
        {/* ── CONTAS BANCÁRIAS ─── */}
        <Section
          id="contas"
          icon={<Wallet className="h-4 w-4" />}
          title="Contas"
          badge={accounts.length > 0 ? `Total: ${formatBRL(totalBalance)}` : 'Nenhuma conta cadastrada'}
          defaultOpen
          onAdd={() => setOpenAccount(true)}
          addLabel="Adicionar conta"
        >
          {accounts.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Adicione suas contas bancárias para ver seu saldo real.
              </p>
              <Button size="sm" variant="outline" className="rounded-2xl gap-1.5" onClick={() => setOpenAccount(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar conta
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { setEditingAccount(acc); setOpenAccount(true); }}
                  className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-accent/40 transition-colors text-left"
                >
                  <span className="text-xl">{acc.emoji ?? '🏦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {acc.type === 'checking' ? 'Conta corrente' :
                       acc.type === 'savings' ? 'Poupança' :
                       acc.type === 'wallet' ? 'Carteira' : 'Conta'}
                    </p>
                  </div>
                  <p className={cn('text-sm font-bold tabular-nums', acc.balance >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatBRL(acc.balance)}
                  </p>
                </button>
              ))}
              {accounts.length > 1 && (
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground">Total</p>
                  <p className={cn('text-sm font-bold tabular-nums', totalBalance >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatBRL(totalBalance)}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── CARTÕES DE CRÉDITO ─── */}
        <Section
          id="cartoes"
          icon={<CreditCardIcon className="h-4 w-4" />}
          title="Cartões de crédito"
          badge={cards.length > 0 ? `${cards.length} cartão${cards.length !== 1 ? 'ões' : ''}` : 'Nenhum cartão cadastrado'}
          defaultOpen
          onAdd={() => setOpenCard(true)}
          addLabel="Adicionar cartão"
        >
          {cards.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Adicione seus cartões para controlar faturas e parcelas.
              </p>
              <Button size="sm" variant="outline" className="rounded-2xl gap-1.5" onClick={() => setOpenCard(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar cartão
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {cards.map((card) => {
                const bankInfo = CREDIT_CARD_BANKS[card.bank];
                return (
                  <button
                    key={card.id}
                    onClick={() => navigate(`/carteira/cartoes/${card.id}`)}
                    className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-accent/40 transition-colors text-left"
                  >
                    <span className="text-xl">{bankInfo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Vence dia {card.dueDay} · Limite {formatBRL(card.limit)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── DÍVIDAS ─── */}
        <Section
          id="dividas"
          icon={<TrendingDown className="h-4 w-4" />}
          title="Dívidas"
          badge={activeDebts.length > 0 ? `${activeDebts.length} ativa${activeDebts.length !== 1 ? 's' : ''} · ${formatBRL(totalDebt)}` : 'Nenhuma dívida ativa 🎉'}
          defaultOpen={activeDebts.length > 0}
          onAdd={() => setOpenDebt(true)}
          addLabel="Nova dívida"
        >
          <div className="px-2 py-2">
            <Debts />
          </div>
        </Section>

        {/* ── METAS E CAIXINHAS ─── */}
        <Section
          id="metas"
          icon={<Target className="h-4 w-4" />}
          title="Metas e Caixinhas"
          badge={`${activeGoals.length} meta${activeGoals.length !== 1 ? 's' : ''} · ${activeCaixinhas.length} caixinha${activeCaixinhas.length !== 1 ? 's' : ''}`}
          defaultOpen
          onAdd={() => setOpenGoal(true)}
          addLabel="Nova meta"
        >
          <div className="px-2 py-2">
            <Goals />
          </div>
        </Section>

        {/* ── INVESTIMENTOS ─── */}
        <Section
          id="investimentos"
          icon={<TrendingUp className="h-4 w-4" />}
          title="Investimentos"
          defaultOpen={false}
        >
          <div className="px-2 py-2">
            <Investments />
          </div>
        </Section>

        <div className="h-4" />
      </div>

      {openAccount && (
        <AccountWizard
          onClose={() => { setOpenAccount(false); setEditingAccount(undefined); }}
          existing={editingAccount}
        />
      )}
      {openCard && <CreditCardWizard onClose={() => setOpenCard(false)} />}
      {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
      {openGoal && <GoalWizard onClose={() => setOpenGoal(false)} />}
    </>
  );
}
