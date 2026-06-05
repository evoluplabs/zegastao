import { useMemo, useState } from 'react';
import { useDebts } from '@/hooks/useDebts';
import { projectDebtPayoff } from '@/lib/projection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DebtTimeline } from '@/components/charts/DebtTimeline';
import { formatBRL } from '@/lib/utils';

export function Projection() {
  const { data: debts } = useDebts();
  const [extra, setExtra] = useState('0');
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  const projection = useMemo(
    () => projectDebtPayoff(debts, parseFloat(extra.replace(',', '.')) || 0, strategy),
    [debts, extra, strategy]
  );

  const endLabel = projection.estimatedEndDate
    ? new Date(`${projection.estimatedEndDate}-01`).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

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
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Quitação em</p>
            <p className="text-2xl font-bold">{projection.monthsToClear} meses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Livre em</p>
            <p className="text-2xl font-bold capitalize">{endLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Juros totais pagos</p>
            <p className="text-2xl font-bold text-destructive">{formatBRL(projection.totalInterestPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo devedor ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <DebtTimeline timeline={projection.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
