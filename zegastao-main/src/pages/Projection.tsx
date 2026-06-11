import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { projectDebtPayoff } from '@/lib/projection';
import { calcAmortization, compareScenarios } from '@/lib/amortization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DebtTimeline } from '@/components/charts/DebtTimeline';
import { formatBRL, formatPct } from '@/lib/utils';

function monthLabel(ym: string): string {
  if (!ym) return '—';
  return new Date(`${ym}-01`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export function Projection() {
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const [extra, setExtra] = useState('0');
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  // ---- Projeção geral de quitação ----
  const projection = useMemo(
    () => projectDebtPayoff(debts, parseFloat(extra.replace(',', '.')) || 0, strategy),
    [debts, extra, strategy]
  );

  // ---- Comparador de cenários (por dívida) ----
  const activeDebts = debts.filter((d) => d.totalBalance > 0);

  if (!activeDebts.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-8">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold">Sem dívidas ativas!</h2>
        <p className="text-muted-foreground max-w-sm">
          Você não tem dívidas para projetar. Isso é excelente — foque agora em construir sua reserva e investir.
        </p>
        <Link
          to="/goals"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ver minhas metas →
        </Link>
      </div>
    );
  }
  const [debtId, setDebtId] = useState('');
  const [scExtra, setScExtra] = useState('200');
  const [scDiscount, setScDiscount] = useState('20');
  const [scInstallments, setScInstallments] = useState('24');

  const selectedDebt = activeDebts.find((d) => d.id === debtId) || activeDebts[0];

  const scenarios = useMemo(() => {
    if (!selectedDebt) return [];
    const principal = selectedDebt.totalBalance;
    const rate = selectedDebt.interestRateMonthly || 0.01;
    const n = selectedDebt.remainingInstallments || parseInt(scInstallments) || 24;
    const extraMonthly = parseFloat(scExtra.replace(',', '.')) || 0;
    const discount = (parseFloat(scDiscount.replace(',', '.')) || 0) / 100;
    return compareScenarios([
      { label: 'Parcela mínima', principal, monthlyRate: rate, totalInstallments: n },
      { label: `+ ${formatBRL(extraMonthly)}/mês`, principal, monthlyRate: rate, totalInstallments: n, extraMonthly },
      { label: `Negociação -${formatPct(discount * 100)} juros`, principal, monthlyRate: rate * (1 - discount), totalInstallments: n },
    ]);
  }, [selectedDebt, scExtra, scDiscount, scInstallments]);

  // ROI do adiantamento (cenário B vs A)
  const advanceRoi = useMemo(() => {
    if (!selectedDebt) return null;
    const n = selectedDebt.remainingInstallments || parseInt(scInstallments) || 24;
    const extraMonthly = parseFloat(scExtra.replace(',', '.')) || 0;
    if (extraMonthly <= 0) return null;
    const advances = Array.from({ length: n }, (_, i) => ({ installmentNumber: i + 1, extraAmount: extraMonthly }));
    return calcAmortization(selectedDebt.totalBalance, selectedDebt.interestRateMonthly || 0.01, n, advances);
  }, [selectedDebt, scExtra, scInstallments]);

  // ---- "Seu futuro em números" (âncoras de longo prazo) ----
  const futureAnchors = useMemo(() => {
    const anchors: { date: string; label: string; detail: string }[] = [];
    if (projection.monthsToClear > 0) {
      anchors.push({
        date: monthLabel(projection.estimatedEndDate),
        label: 'Todas as dívidas quitadas',
        detail: `Juros pagos no caminho: ${formatBRL(projection.totalInterestPaid)}`,
      });
    }
    goals.forEach((g) => {
      const monthly = (g as { monthlyContribution?: number }).monthlyContribution || 0;
      if (monthly > 0 && g.currentAmount < g.targetAmount) {
        const months = Math.ceil((g.targetAmount - g.currentAmount) / monthly);
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        anchors.push({
          date: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          label: `Meta: ${g.name}`,
          detail: `${formatBRL(g.targetAmount)} alcançados`,
        });
      }
    });
    return anchors;
  }, [projection, goals]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projeção de quitação</h2>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Pagamento extra por mês (R$)</Label>
            <Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Estratégia</Label>
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value as 'avalanche' | 'snowball')}>
              <option value="avalanche">Avalanche (maior juros primeiro)</option>
              <option value="snowball">Bola de neve (menor saldo primeiro)</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Quitação em" value={`${projection.monthsToClear} meses`} />
        <Stat label="Livre em" value={monthLabel(projection.estimatedEndDate)} />
        <Stat label="Juros totais pagos" value={formatBRL(projection.totalInterestPaid)} danger />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo devedor ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <DebtTimeline timeline={projection.timeline} />
        </CardContent>
      </Card>

      {/* Comparador de cenários */}
      {activeDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparar cenários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Dívida</Label>
                <Select value={selectedDebt?.id} onChange={(e) => setDebtId(e.target.value)}>
                  {activeDebts.map((d) => (
                    <option key={d.id} value={d.id}>{d.creditor} — {formatBRL(d.totalBalance)}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Extra/mês</Label>
                  <Input inputMode="decimal" value={scExtra} onChange={(e) => setScExtra(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Desconto %</Label>
                  <Input inputMode="decimal" value={scDiscount} onChange={(e) => setScDiscount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Parcelas</Label>
                  <Input inputMode="numeric" value={scInstallments} onChange={(e) => setScInstallments(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {scenarios.map((s, i) => (
                <div key={i} className={`rounded-lg border p-3 text-sm ${i === 0 ? '' : 'border-success/40 bg-success/5'}`}>
                  <p className="font-semibold">{s.label}</p>
                  <p className="mt-2 text-muted-foreground">Quitação: <span className="text-foreground">{monthLabel(s.endDate)}</span></p>
                  <p className="text-muted-foreground">Juros totais: <span className="text-foreground">{formatBRL(s.totalInterest)}</span></p>
                  <p className="text-muted-foreground">
                    Economia:{' '}
                    <span className={s.interestSavedVsBaseline > 0 ? 'font-semibold text-success' : ''}>
                      {s.interestSavedVsBaseline > 0 ? formatBRL(s.interestSavedVsBaseline) : '—'}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {advanceRoi?.savings.roi && (
              <div className="rounded-md border border-success/40 bg-success/5 p-3 text-sm">
                <p className="font-medium text-success">{advanceRoi.savings.roi}</p>
                <p className="text-muted-foreground">
                  Adiantando, você quita {advanceRoi.savings.monthsSaved} mês(es) antes e economiza{' '}
                  {formatBRL(advanceRoi.savings.interestSaved)} em juros.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seu futuro em números */}
      {futureAnchors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Seu futuro em números
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {futureAnchors.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium capitalize text-primary">{a.date}</span>
                  <div className="text-sm">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold capitalize ${danger ? 'text-destructive' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
