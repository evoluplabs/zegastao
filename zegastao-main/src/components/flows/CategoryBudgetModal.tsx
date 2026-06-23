import { useState, useEffect } from 'react';
import { X, Trash2, Info } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/button';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { addUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import { BENCHMARKS } from '@/lib/benchmarks';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  categories: { name: string; amount: number }[];
  income: number;
}

export function CategoryBudgetModal({ onClose, categories, income }: Props) {
  const { data: budgets } = useCategoryBudgets();
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  // Sync limits state when budgets load
  useEffect(() => {
    const init: Record<string, number> = {};
    budgets.forEach((b) => { init[b.category] = b.monthlyLimit; });
    setLimits(init);
  }, [budgets]);

  function getBudget(cat: string) {
    return budgets.find((b) => b.category === cat);
  }

  function getSuggested(cat: string): number {
    const b = BENCHMARKS[cat];
    return b && income > 0 ? Math.round((b.ideal / 100) * income) : 0;
  }

  async function save() {
    setBusy(true);
    try {
      for (const [cat, limit] of Object.entries(limits)) {
        if (limit <= 0) continue;
        const existing = getBudget(cat);
        if (existing) {
          await updateUserDoc('category_budgets', existing.id, { monthlyLimit: limit });
        } else {
          await addUserDoc('category_budgets', { category: cat, monthlyLimit: limit });
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function removeLimit(cat: string) {
    const existing = getBudget(cat);
    if (!existing) return;
    await deleteUserDoc('category_budgets', existing.id);
    setLimits((prev) => { const n = { ...prev }; delete n[cat]; return n; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-base">Limites por categoria</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-primary/5 border-b flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          <span>Defina quanto pode gastar por mês em cada categoria. Sugestões baseadas em benchmarks financeiros saudáveis.</span>
        </div>

        <div className="overflow-y-auto max-h-[55vh] px-6 py-4 space-y-5">
          {categories.map((cat) => {
            const suggested = getSuggested(cat.name);
            const existing = getBudget(cat.name);
            const currentLimit = limits[cat.name] ?? existing?.monthlyLimit ?? 0;
            const isOver = currentLimit > 0 && cat.amount > currentLimit;
            const pct = currentLimit > 0 ? Math.min(200, (cat.amount / currentLimit) * 100) : 0;

            return (
              <div key={cat.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium', isOver ? 'text-destructive' : 'text-muted-foreground')}>
                      gasto: {formatBRL(cat.amount)} {isOver && '⚠'}
                    </span>
                    {existing && (
                      <button
                        onClick={() => removeLimit(cat.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover limite"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <CurrencyInput
                  value={currentLimit}
                  onChange={(v) => setLimits((prev) => ({ ...prev, [cat.name]: v }))}
                  placeholder={suggested > 0 ? `Sugerido: ${formatBRL(suggested)}` : 'Definir limite…'}
                />

                {currentLimit > 0 && (
                  <div className="space-y-0.5">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isOver ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground text-right">
                      {Math.round(pct)}% do limite {isOver ? '— acima!' : ''}
                    </p>
                  </div>
                )}

                {!currentLimit && suggested > 0 && (
                  <button
                    onClick={() => setLimits((prev) => ({ ...prev, [cat.name]: suggested }))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Usar sugestão: {formatBRL(suggested)}/mês
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar limites'}
          </Button>
        </div>
      </div>
    </div>
  );
}
