// E5 — A Fazenda do Ouro
// Investimentos e contas com rendimento como "Empregados" (idle generators).
import { TrendingUp, Coins } from 'lucide-react';
import { useInvestments } from '@/hooks/useJourney';
import { useAccounts } from '@/hooks/useAccounts';
import { formatBRL, cn } from '@/lib/utils';
import type { Investment } from '@/types';
import type { Account } from '@/types';

// Estimativa de rendimento mensal por tipo de conta/investimento
function estimateInvMonthlyReturn(inv: Investment): number {
  if (inv.monthlyIncome) return inv.monthlyIncome;
  const amount = inv.currentValue ?? inv.amount ?? 0;
  const type = inv.type?.toLowerCase() ?? '';
  if (type === 'cdb' || type === 'tesouro' || type === 'lci' || type === 'lca')
    return amount * 0.008;
  if (type === 'fii') return amount * 0.006;
  if (type === 'acoes') return amount * 0.004;
  return amount * 0.006;
}

function estimateAccMonthlyReturn(acc: Account): number {
  if (acc.type === 'savings') return acc.balance * 0.005;
  if (acc.type === 'investment') return acc.balance * 0.007;
  return 0;
}

const INVESTMENT_EMOJI: Record<string, string> = {
  cdb: '🏦', lci: '🏠', lca: '🌾', tesouro: '🇧🇷',
  ação: '📈', acao: '📈', etf: '📊', fii: '🏢',
  'fundo de investimento': '📦', poupança: '🐷',
};

function getInvestmentEmoji(type: string): string {
  const lower = type.toLowerCase();
  const key = Object.keys(INVESTMENT_EMOJI).find((k) => lower.includes(k));
  return key ? INVESTMENT_EMOJI[key] : '💰';
}

const ACCOUNT_EMOJIS: Record<string, string> = {
  checking: '🏦', savings: '🐷', wallet: '👜', investment: '📈', other: '💰',
};

export function FarmPanel() {
  const { data: investments } = useInvestments();
  const { data: accounts } = useAccounts();

  const savingsAccounts = accounts.filter((a) => a.type === 'savings' || a.type === 'investment');

  const totalMonthlyReturn = [
    ...investments.map(estimateInvMonthlyReturn),
    ...savingsAccounts.map(estimateAccMonthlyReturn),
  ].reduce((s, v) => s + v, 0);

  const totalPatrimony = [
    ...investments.map((inv) => inv.currentValue ?? inv.amount ?? 0),
    ...savingsAccounts.map((acc) => acc.balance),
  ].reduce((s, v) => s + v, 0);

  const hasAssets = investments.length > 0 || savingsAccounts.length > 0;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Fazenda */}
      <div className="rpg-panel rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-background flex items-center justify-center text-2xl">🌾</div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-foreground">A Fazenda do Ouro</p>
            <p className="text-xs text-muted-foreground">Seus empregados trabalhando 24h por dia</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Renda passiva/mês</p>
            <p className="font-display font-bold text-gold">{formatBRL(totalMonthlyReturn)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-xl bg-background/60 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Patrimônio</p>
            <p className="font-bold text-sm">{formatBRL(totalPatrimony)}</p>
          </div>
          <div className="flex-1 rounded-xl bg-background/60 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Empregados</p>
            <p className="font-bold text-sm">{investments.length + savingsAccounts.length}</p>
          </div>
          <div className="flex-1 rounded-xl bg-background/60 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Yield est.</p>
            <p className="font-bold text-sm">
              {totalPatrimony > 0
                ? `${((totalMonthlyReturn / totalPatrimony) * 100).toFixed(1)}%`
                : '–'}
            </p>
          </div>
        </div>
      </div>

      {!hasAssets ? (
        <div className="rounded-xl border bg-card p-6 text-center space-y-2">
          <div className="text-3xl">🌱</div>
          <p className="text-sm font-semibold">Sua fazenda ainda está vazia</p>
          <p className="text-xs text-muted-foreground">
            Registre investimentos ou contas de poupança para ver seus empregados trabalhando.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Investimentos como empregados */}
          {investments.map((inv) => {
            const monthly = estimateInvMonthlyReturn(inv);
            const amount = inv.currentValue ?? inv.amount ?? 0;
            const emoji = getInvestmentEmoji(inv.type ?? '');
            return (
              <div key={inv.id} className="rounded-xl border bg-card p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center text-xl shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{inv.ticker ?? inv.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.institution ?? ''}
                    {inv.type && <span> · {inv.type.toUpperCase()}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBRL(amount)} investidos</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-bold">{formatBRL(monthly)}/mês</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">estimado</p>
                </div>
              </div>
            );
          })}

          {/* Contas de poupança como empregados */}
          {savingsAccounts.map((acc) => {
            const monthly = estimateAccMonthlyReturn(acc);
            const emoji = acc.emoji ?? ACCOUNT_EMOJIS[acc.type] ?? '🏦';
            return (
              <div key={acc.id} className="rounded-xl border bg-card p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {acc.institution ?? ''}
                    {acc.type === 'savings' ? ' · Poupança' : ' · Conta Investimento'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBRL(acc.balance)} em saldo</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-primary">
                    <Coins className="h-3 w-3" />
                    <span className="text-xs font-bold">{formatBRL(monthly)}/mês</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">estimado</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasAssets && totalMonthlyReturn > 0 && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            🌾 Seus empregados geram <span className="font-bold text-gold">{formatBRL(totalMonthlyReturn)}</span> por mês enquanto você dorme.
          </p>
        </div>
      )}
    </div>
  );
}
