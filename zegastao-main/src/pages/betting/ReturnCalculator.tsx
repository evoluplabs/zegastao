import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';

interface Leg {
  odd: number;
  label: string;
}

export function ReturnCalculator() {
  const [stake, setStake] = useState('5');
  const [legs, setLegs] = useState<Leg[]>([
    { odd: 1.85, label: '' },
    { odd: 2.10, label: '' },
  ]);

  const totalOdd = legs.reduce((acc, l) => acc * (l.odd || 1), 1);
  const stakeNum = parseFloat(stake) || 0;
  const potentialReturn = stakeNum * totalOdd;
  const profit = potentialReturn - stakeNum;

  function addLeg() {
    if (legs.length >= 8) return;
    setLegs([...legs, { odd: 1.5, label: '' }]);
  }

  function removeLeg(i: number) {
    if (legs.length <= 1) return;
    setLegs(legs.filter((_, idx) => idx !== i));
  }

  function updateLeg(i: number, field: keyof Leg, value: string) {
    setLegs(legs.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'odd' ? parseFloat(value) || 0 : value } : l
    ));
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Calculadora de Múltipla</h3>
      </div>

      {/* Stake */}
      <div className="space-y-1">
        <Label className="text-xs">Valor da aposta (R$)</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="h-8 text-sm"
          min="0.01"
          step="0.5"
        />
      </div>

      {/* Legs */}
      <div className="space-y-2">
        <Label className="text-xs">Seleções</Label>
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder={`Jogo ${i + 1}`}
              value={leg.label}
              onChange={(e) => updateLeg(i, 'label', e.target.value)}
              className="h-7 text-xs flex-1"
            />
            <Input
              type="number"
              inputMode="decimal"
              value={leg.odd}
              onChange={(e) => updateLeg(i, 'odd', e.target.value)}
              className="h-7 text-xs w-20"
              min="1.01"
              step="0.05"
            />
            <button
              onClick={() => removeLeg(i)}
              className="text-muted-foreground hover:text-destructive text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={addLeg}
          disabled={legs.length >= 8}
        >
          + Adicionar seleção
        </Button>
      </div>

      {/* Result */}
      <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-50 border border-green-100 p-3 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Odd total</span>
          <span className="font-bold text-foreground">{totalOdd.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Retorno potencial</span>
          <span className="font-bold text-green-700">{formatBRL(potentialReturn)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground border-t pt-1 mt-1">
          <span>Lucro potencial</span>
          <span className="font-extrabold text-green-600">{formatBRL(profit)}</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Apostas combinadas têm maior retorno potencial mas menor probabilidade de acerto. Use com responsabilidade.
      </p>
    </div>
  );
}
