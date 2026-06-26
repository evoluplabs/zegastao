import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Trash2, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useUserCollection } from '@/hooks/useCollection';
import { addUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import { useDebts } from '@/hooks/useDebts';
import { cn } from '@/lib/utils';
import {
  INVENTORY_SUGGESTIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  estimatedValue,
  type InventoryCategory,
} from '@/lib/inventorySuggestions';
import type { InventoryItem, Debt } from '@/types';

const OLX_LINKS: Partial<Record<InventoryCategory, string>> = {
  electronics: 'https://www.olx.com.br/eletronicos-e-celulares',
  appliances:  'https://www.olx.com.br/eletrodomesticos',
  furniture:   'https://www.olx.com.br/moveis',
  clothing:    'https://www.olx.com.br/moda-e-beleza',
  vehicle:     'https://www.olx.com.br/veiculos',
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function debtRemaining(d: Debt): number {
  return d.monthlyPayment * d.remainingInstallments || d.totalBalance;
}

function getHighestInterestDebt(debts: Debt[]): Debt | null {
  const active = debts.filter((d) => d.status === 'active' && debtRemaining(d) > 0);
  if (active.length === 0) return null;
  return active.reduce((best, d) =>
    (d.interestRateMonthly ?? 0) > (best.interestRateMonthly ?? 0) ? d : best
  );
}

interface AddItemFormProps {
  onAdd: (item: Omit<InventoryItem, 'id'>) => void;
  onCancel: () => void;
}

function AddItemForm({ onAdd, onCancel }: AddItemFormProps) {
  const [category, setCategory] = useState<InventoryCategory>('electronics');
  const [name, setName] = useState('');
  const [customValue, setCustomValue] = useState('');

  const suggestion = useMemo(
    () => INVENTORY_SUGGESTIONS.find(
      (s) => s.category === category && (name === '' || s.name.toLowerCase().includes(name.toLowerCase()))
    ),
    [category, name]
  );

  const estimV = suggestion ? estimatedValue(suggestion) : 0;
  const finalValue = customValue ? parseFloat(customValue.replace(',', '.')) : estimV;

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category,
      estimatedValue: estimV || finalValue,
      customValue: customValue ? finalValue : undefined,
      status: 'available',
      addedAt: new Date().toISOString(),
    });
  }

  const categories: InventoryCategory[] = ['electronics', 'appliances', 'furniture', 'clothing', 'vehicle', 'other'];

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4">
      <h3 className="font-bold text-sm text-foreground">+ Novo item no inventário</h3>

      {/* Category picker */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Categoria</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Nome do item</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: TV Samsung 32&quot;"
          className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {/* Suggestions */}
        {name.length < 2 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INVENTORY_SUGGESTIONS.filter((s) => s.category === category).slice(0, 5).map((s) => (
              <button
                key={s.name}
                onClick={() => setName(s.name)}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          Valor estimado {suggestion ? `(sugestão: ${formatBRL(suggestion.minValue)}–${formatBRL(suggestion.maxValue)})` : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">R$</span>
          <input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={estimV > 0 ? String(estimV) : 'ex: 350'}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            inputMode="decimal"
          />
        </div>
        {finalValue > 0 && (
          <p className="text-xs text-emerald-400 mt-1 font-medium">
            💰 Valor final: {formatBRL(finalValue)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!name.trim() || finalValue <= 0}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          Adicionar ao Inventário
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface ItemCardProps {
  item: InventoryItem;
  bestDebt: Debt | null;
  onSell: (id: string, soldFor: number) => void;
  onDelete: (id: string) => void;
}

function ItemCard({ item, bestDebt, onSell, onDelete }: ItemCardProps) {
  const [selling, setSelling] = useState(false);
  const [soldFor, setSoldFor] = useState('');
  const value = item.customValue ?? item.estimatedValue;
  const olxLink = OLX_LINKS[item.category];

  const remaining = bestDebt ? debtRemaining(bestDebt) : 0;
  const debtImpact = bestDebt && remaining > 0
    ? Math.round((value / remaining) * 100)
    : null;

  if (item.status === 'sold') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center gap-3 opacity-70">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-through">{item.name}</p>
          <p className="text-xs text-emerald-400">
            ✅ Vendido por {formatBRL(item.soldFor ?? value)} · +100 XP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{CATEGORY_ICONS[item.category]}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
          <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category]}</p>
          <p className="text-sm font-bold text-amber-400 mt-0.5">{formatBRL(value)}</p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Debt impact */}
      {bestDebt && debtImpact !== null && (
        <div className="flex items-center gap-2 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
          <span className="text-red-400">⚔️</span>
          <span className="text-red-300">
            Dano no Boss <span className="font-bold">{bestDebt.creditor}</span>:{' '}
            <span className="font-bold">{debtImpact}% do HP</span>
          </span>
        </div>
      )}

      {/* Generated quest */}
      {!selling && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">
            ⚡ MISSÃO ESPECIAL
          </p>
          <p className="text-xs text-foreground">
            Vender <span className="font-semibold">{item.name}</span> → Recompensa: ~{formatBRL(value)}
            {bestDebt ? ` → ${debtImpact}% do Boss ${bestDebt.creditor}` : ''}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">+100 XP ao concluir</p>
        </div>
      )}

      {/* Action buttons */}
      {!selling ? (
        <div className="flex gap-2">
          <button
            onClick={() => setSelling(true)}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            ✅ Marcar como vendido
          </button>
          {olxLink && (
            <a
              href={olxLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              OLX
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quanto você recebeu?</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              value={soldFor}
              onChange={(e) => setSoldFor(e.target.value)}
              placeholder={String(value)}
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              inputMode="decimal"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const v = soldFor ? parseFloat(soldFor.replace(',', '.')) : value;
                onSell(item.id, v);
              }}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              🎉 Confirmar venda!
            </button>
            <button
              onClick={() => setSelling(false)}
              className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Inventory() {
  const { user } = useStore();
  const { data: items = [], loading } = useUserCollection<InventoryItem>('inventory');
  const { data: debts } = useDebts();
  const [showForm, setShowForm] = useState(false);

  const bestDebt = useMemo(() => getHighestInterestDebt(debts), [debts]);
  const availableItems = items.filter((i) => i.status === 'available');
  const soldItems = items.filter((i) => i.status === 'sold');
  const totalPotential = availableItems.reduce((s, i) => s + (i.customValue ?? i.estimatedValue), 0);

  async function handleAdd(item: Omit<InventoryItem, 'id'>) {
    if (!user) return;
    await addUserDoc('inventory', item);
    setShowForm(false);
  }

  async function handleSell(id: string, soldFor: number) {
    await updateUserDoc('inventory', id, {
      status: 'sold',
      soldAt: new Date().toISOString(),
      soldFor,
    });
  }

  async function handleDelete(id: string) {
    await deleteUserDoc('inventory', id);
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-amber-950/30 via-card to-card p-5 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Package className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Inventário</h1>
            <p className="text-xs text-muted-foreground">Seus itens → Missões de venda</p>
          </div>
        </div>

        {availableItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Itens disponíveis</p>
              <p className="text-xl font-bold text-foreground">{availableItems.length}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Potencial de venda</p>
              <p className="text-xl font-bold text-amber-400">{formatBRL(totalPotential)}</p>
            </div>
          </div>
        )}

        {bestDebt && totalPotential > 0 && (
          <div className="flex items-center gap-2 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2.5">
            <span>⚔️</span>
            <span className="text-red-300">
              Vender tudo causaria <span className="font-bold">
                {Math.min(100, Math.round((totalPotential / debtRemaining(bestDebt)) * 100))}%
              </span> de dano no Boss <span className="font-bold">{bestDebt.creditor}</span>
            </span>
          </div>
        )}
      </div>

      {/* Add form or button */}
      {showForm ? (
        <AddItemForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-4 text-sm font-semibold text-primary hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar item ao Inventário
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* Available items */}
      {!loading && availableItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            Missões ativas ({availableItems.length})
          </h2>
          {availableItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              bestDebt={bestDebt}
              onSell={handleSell}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="text-center py-10 space-y-3">
          <span className="text-5xl">📦</span>
          <p className="font-bold text-foreground">Inventário vazio</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Adicione itens que você tem em casa — TV, celular, móveis — e o sistema vai
            gerar missões de venda para atacar seus bosses (dívidas).
          </p>
        </div>
      )}

      {/* Sold items */}
      {soldItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-bold text-muted-foreground">
            ✅ Vendidos ({soldItems.length})
          </h2>
          {soldItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              bestDebt={null}
              onSell={handleSell}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Link to debts */}
      {bestDebt && (
        <Link
          to="/carteira"
          className="flex items-center justify-between rounded-xl border border-red-900/30 bg-red-950/10 px-4 py-3 hover:bg-red-950/20 transition-colors"
        >
          <div>
            <p className="text-sm font-bold text-red-400">☠️ Ver Boss {bestDebt.creditor}</p>
            <p className="text-xs text-muted-foreground">
              {formatBRL(debtRemaining(bestDebt))} restantes
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-red-400 shrink-0" />
        </Link>
      )}
    </div>
  );
}
