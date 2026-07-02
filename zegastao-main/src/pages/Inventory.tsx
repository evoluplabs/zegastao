import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Package, Trash2, CheckCircle2, ArrowRight,
  Store, X, Copy, Check, Phone, Zap, ShoppingBag, MessageCircle,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useUserCollection } from '@/hooks/useCollection';
import {
  addUserDoc, updateUserDoc, deleteUserDoc,
  addPublicDoc, updatePublicDoc, deletePublicDoc,
} from '@/lib/firestore';
import { useDebts } from '@/hooks/useDebts';
import { cn } from '@/lib/utils';
import {
  INVENTORY_SUGGESTIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  estimatedValue,
  rarityForValue,
  RARITY_META,
  CONDITION_LABELS,
  CONDITION_ORDER,
  type InventoryCategory,
  type Rarity,
  type ItemCondition,
} from '@/lib/inventorySuggestions';
import type { InventoryItem, Debt } from '@/types';
import { levelFromXP } from '@/lib/xp';
import { getClass } from '@/lib/rpg/character';


function RarityBadge({ rarity }: { rarity: Rarity }) {
  const m = RARITY_META[rarity];
  return (
    <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5 border', m.text, m.border, m.bg)}>
      {m.emoji} {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

const OLX_LINKS: Partial<Record<InventoryCategory, string>> = {
  electronics: 'https://www.olx.com.br/eletronicos-e-celulares',
  appliances:  'https://www.olx.com.br/eletrodomesticos',
  furniture:   'https://www.olx.com.br/moveis',
  clothing:    'https://www.olx.com.br/moda-e-beleza',
  vehicle:     'https://www.olx.com.br/veiculos',
};

const QUICK_SELL_PLATFORMS: Record<InventoryCategory, { name: string; url: string; emoji: string }[]> = {
  electronics: [
    { name: 'Enjoei', url: 'https://www.enjoei.com.br', emoji: '💜' },
    { name: 'Trocafone', url: 'https://trocafone.com', emoji: '📱' },
    { name: 'OLX', url: 'https://www.olx.com.br/eletronicos-e-celulares', emoji: '🛒' },
  ],
  appliances: [
    { name: 'OLX', url: 'https://www.olx.com.br/eletrodomesticos', emoji: '🛒' },
    { name: 'Enjoei', url: 'https://www.enjoei.com.br', emoji: '💜' },
  ],
  furniture: [
    { name: 'OLX', url: 'https://www.olx.com.br/moveis', emoji: '🛒' },
    { name: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/', emoji: '📘' },
  ],
  clothing: [
    { name: 'Enjoei', url: 'https://www.enjoei.com.br', emoji: '💜' },
    { name: 'Vinted', url: 'https://www.vinted.com.br', emoji: '👗' },
    { name: 'OLX', url: 'https://www.olx.com.br/moda-e-beleza', emoji: '🛒' },
  ],
  vehicle: [
    { name: 'OLX Autos', url: 'https://www.olx.com.br/veiculos', emoji: '🚗' },
    { name: 'Webmotors', url: 'https://www.webmotors.com.br', emoji: '🏎️' },
  ],
  other: [
    { name: 'OLX', url: 'https://www.olx.com.br', emoji: '🛒' },
    { name: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/', emoji: '📘' },
  ],
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

function generateAnnouncementText(item: InventoryItem, price: number, bestDebt: Debt | null): string {
  const icon = CATEGORY_ICONS[item.category as InventoryCategory];
  const label = CATEGORY_LABELS[item.category as InventoryCategory];
  const impact = bestDebt
    ? Math.round((price / debtRemaining(bestDebt)) * 100)
    : null;

  return [
    `${icon} *VENDO: ${item.name}*`,
    '',
    `💰 Preço: ${formatBRL(price)}`,
    `🏷️ Categoria: ${label}`,
    `✅ Estado: Usado, bom estado`,
    '',
    `📲 Interessado? Me chame no WhatsApp!`,
    ...(impact ? [`\n_🎮 Vendendo para atacar Boss financeiro (${impact}% de dano)_`] : []),
    `_📲 Anúncio criado com Zé Gastão_`,
  ].join('\n');
}

// ─────────────────────────────────────────────
//  SellModal — two modes
// ─────────────────────────────────────────────

interface SellModalProps {
  item: InventoryItem;
  bestDebt: Debt | null;
  currentUser: { uid: string; displayName?: string | null } | null;
  onClose: () => void;
  onListPublic: (price: number, phone: string, negotiable: boolean) => Promise<void>;
  onMarkSold: (soldFor: number) => void;
}

function SellModal({ item, bestDebt, currentUser, onClose, onListPublic, onMarkSold }: SellModalProps) {
  const value = item.customValue ?? item.estimatedValue;
  const [mode, setMode] = useState<'choose' | 'quick' | 'market'>('choose');
  const [price, setPrice] = useState(String(value));
  const [phone, setPhone] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [copied, setCopied] = useState(false);
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(item.status === 'listed');
  const [soldFor, setSoldFor] = useState('');
  const [confirmSold, setConfirmSold] = useState(false);

  const finalPrice = parseFloat(price.replace(',', '.')) || value;
  const announcementText = generateAnnouncementText(item, finalPrice, bestDebt);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(announcementText)}`;
  const olxUrl = OLX_LINKS[item.category as InventoryCategory] || 'https://www.olx.com.br';
  const quickSellPlatforms = QUICK_SELL_PLATFORMS[item.category as InventoryCategory] || QUICK_SELL_PLATFORMS.other;

  const debtImpact = bestDebt && finalPrice > 0
    ? Math.round((finalPrice / debtRemaining(bestDebt)) * 100)
    : null;

  async function handleListPublic() {
    setListing(true);
    await onListPublic(finalPrice, phone, negotiable);
    setListed(true);
    setListing(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(announcementText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConfirmSold() {
    const v = soldFor ? parseFloat(soldFor.replace(',', '.')) : finalPrice;
    onMarkSold(v);
    onClose();
  }

  const categoryIcon = CATEGORY_ICONS[item.category as InventoryCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-[#211a11] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <p className="font-bold text-foreground text-sm">{item.name}</p>
              <p className="text-xs text-amber-400">{formatBRL(value)} estimado</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground/70 hover:text-foreground/80 transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Mode picker */}
          {mode === 'choose' && (
            <>
              <p className="text-xs text-muted-foreground/70 uppercase tracking-widest font-bold">Como vender?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('quick')}
                  className="rounded-xl border border-border bg-[#1a130b] p-4 text-left hover:border-amber-500/40 transition-colors"
                >
                  <Zap className="h-5 w-5 text-amber-400 mb-2" />
                  <p className="font-bold text-sm text-foreground">Vender Rápido</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Plataformas de revenda — dinheiro em dias</p>
                </button>
                <button
                  onClick={() => setMode('market')}
                  className="rounded-xl border border-border bg-[#1a130b] p-4 text-left hover:border-green-500/40 transition-colors"
                >
                  <Store className="h-5 w-5 text-green-400 mb-2" />
                  <p className="font-bold text-sm text-foreground">Anunciar no Mercado</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">WhatsApp + Loja da Guilda — você define o preço</p>
                </button>
              </div>

              {debtImpact !== null && (
                <div className="flex items-center gap-2 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2.5">
                  <span>⚔️</span>
                  <span className="text-red-300">
                    Vender causaria <span className="font-bold">{debtImpact}% de dano</span> no Boss{' '}
                    <span className="font-bold">{bestDebt!.creditor}</span>
                  </span>
                </div>
              )}
            </>
          )}

          {/* Quick Sell */}
          {mode === 'quick' && (
            <>
              <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground/70 hover:text-foreground/80 flex items-center gap-1">
                ← Voltar
              </button>
              <div>
                <p className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-3">⚡ Plataformas de Revenda Rápida</p>
                <div className="space-y-2">
                  {quickSellPlatforms.map((p) => (
                    <a
                      key={p.name}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-border bg-[#1a130b] px-4 py-3 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{p.emoji}</span>
                        <span className="text-sm font-semibold text-foreground/90">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/70">Anunciar →</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground/70 mb-3">Já vendeu? Registre para ganhar XP:</p>
                {!confirmSold ? (
                  <button
                    onClick={() => setConfirmSold(true)}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors"
                  >
                    ✅ Marcar como vendido → +100 XP
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Por quanto vendeu?</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground/70">R$</span>
                      <input
                        value={soldFor}
                        onChange={(e) => setSoldFor(e.target.value)}
                        placeholder={String(value)}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50"
                        inputMode="decimal"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmSold}
                        className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors"
                      >
                        🎉 Confirmar!
                      </button>
                      <button onClick={() => setConfirmSold(false)} className="px-4 py-2.5 rounded-xl border border-border text-xs text-muted-foreground/70 hover:bg-secondary">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Market / Announce */}
          {mode === 'market' && (
            <>
              <button onClick={() => setMode('choose')} className="text-xs text-muted-foreground/70 hover:text-foreground/80 flex items-center gap-1">
                ← Voltar
              </button>

              {/* Price */}
              <div>
                <p className="text-xs text-muted-foreground/70 uppercase tracking-widest font-bold mb-2">Preço por unidade</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground/70 font-semibold">R$</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-lg font-bold text-foreground focus:outline-none focus:border-green-500/50"
                    inputMode="decimal"
                  />
                </div>
                {debtImpact !== null && (
                  <p className="text-xs text-red-400 mt-1.5">
                    ⚔️ Dano ao Boss: <span className="font-bold">{Math.round((finalPrice / debtRemaining(bestDebt!)) * 100)}% do HP</span>
                  </p>
                )}
              </div>

              {/* Announcement preview */}
              <div className="rounded-xl bg-[#1a130b] border border-border p-4">
                <p className="text-[10px] text-green-400 uppercase tracking-wide font-bold mb-2">Prévia do anúncio</p>
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{announcementText}</pre>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-[#1a130b] text-foreground/80 text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado!' : 'Copiar texto'}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20c05c] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a href={olxUrl} target="_blank" rel="noopener noreferrer"
                  className="py-2.5 text-center rounded-xl border border-border text-xs text-muted-foreground hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                  🛒 OLX
                </a>
                <a href="https://www.facebook.com/marketplace/" target="_blank" rel="noopener noreferrer"
                  className="py-2.5 text-center rounded-xl border border-border text-xs text-muted-foreground hover:border-sky-500/30 hover:text-sky-400 transition-colors">
                  📘 Facebook
                </a>
              </div>

              {/* Guild store listing */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-foreground/90">Loja da Guilda</p>
                  {listed && (
                    <span className="ml-auto text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">
                      ✅ Listado
                    </span>
                  )}
                </div>
                {!listed ? (
                  <>
                    <p className="text-xs text-muted-foreground/70">
                      Liste publicamente para que outros aventureiros vejam e entrem em contato. Opcional: adicione seu WhatsApp para contato direto.
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="WhatsApp (opcional, ex: 11999998888)"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50"
                        type="tel"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={negotiable}
                        onChange={(e) => setNegotiable(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-background accent-amber-500"
                      />
                      <span className="text-xs text-muted-foreground">Aceito propostas (preço negociável)</span>
                    </label>
                    <button
                      onClick={handleListPublic}
                      disabled={listing}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      {listing ? 'Listando...' : '🏪 Listar na Loja da Guilda'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground/70">
                    Seu item está visível na Loja da Guilda. Quando vender, marque como vendido e ele será removido automaticamente.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  AddItemForm
// ─────────────────────────────────────────────

interface AddItemFormProps {
  onAdd: (item: Omit<InventoryItem, 'id'>) => void;
  onCancel: () => void;
}

function AddItemForm({ onAdd, onCancel }: AddItemFormProps) {
  const [category, setCategory] = useState<InventoryCategory>('electronics');
  const [name, setName] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('bom');
  const [description, setDescription] = useState('');

  const suggestion = useMemo(
    () => INVENTORY_SUGGESTIONS.find(
      (s) => s.category === category && (name === '' || s.name.toLowerCase().includes(name.toLowerCase()))
    ),
    [category, name]
  );

  const estimV = suggestion ? estimatedValue(suggestion) : 0;
  const finalValue = customValue ? parseFloat(customValue.replace(',', '.')) : estimV;
  const rarity = rarityForValue(finalValue || 0);
  const rarityMeta = RARITY_META[rarity];

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category,
      estimatedValue: estimV || finalValue,
      customValue: customValue ? finalValue : undefined,
      status: 'available',
      addedAt: new Date().toISOString(),
      condition,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  }

  const categories: InventoryCategory[] = ['electronics', 'appliances', 'furniture', 'clothing', 'vehicle', 'other'];

  return (
    <div className="rounded-xl border border-primary/30 bg-[#211a11] p-4 space-y-4">
      <h3 className="font-bold text-sm text-foreground">+ Novo item no Inventário</h3>

      <div>
        <p className="text-xs text-muted-foreground/70 mb-2">Categoria</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                category === cat
                  ? 'bg-green-500 text-stone-950 border-green-500'
                  : 'border-border text-muted-foreground hover:border-green-500/40'
              )}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground/70 mb-1">Nome do item</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='ex: TV Samsung 32"'
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50"
        />
        {name.length < 2 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INVENTORY_SUGGESTIONS.filter((s) => s.category === category).slice(0, 5).map((s) => (
              <button
                key={s.name}
                onClick={() => setName(s.name)}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground/70 hover:border-green-500/40 hover:text-green-400 transition-colors"
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground/70 mb-1">
          Valor estimado {suggestion ? `(sugestão: ${formatBRL(suggestion.minValue)}–${formatBRL(suggestion.maxValue)})` : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground/70">R$</span>
          <input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={estimV > 0 ? String(estimV) : 'ex: 350'}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50"
            inputMode="decimal"
          />
        </div>
        {finalValue > 0 && (
          <p className="text-xs text-green-400 mt-1 font-medium flex items-center gap-2">
            💰 Valor final: {formatBRL(finalValue)}
            <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5 border', rarityMeta.text, rarityMeta.border, rarityMeta.bg)}>
              {rarityMeta.emoji} {rarityMeta.label}
            </span>
          </p>
        )}
      </div>

      {/* Condição */}
      <div>
        <p className="text-xs text-muted-foreground/70 mb-2">Condição</p>
        <div className="flex flex-wrap gap-2">
          {CONDITION_ORDER.map((c) => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                condition === c
                  ? 'bg-green-500 text-stone-950 border-green-500'
                  : 'border-border text-muted-foreground hover:border-green-500/40'
              )}
            >
              {CONDITION_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição (opcional) */}
      <div>
        <p className="text-xs text-muted-foreground/70 mb-1">Descrição (opcional)</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes: marca, tempo de uso, acessórios inclusos..."
          rows={2}
          maxLength={280}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!name.trim() || finalValue <= 0}
          className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-stone-950 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Adicionar ao Inventário
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground/70 text-sm hover:bg-secondary transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ItemCard
// ─────────────────────────────────────────────

interface ItemCardProps {
  item: InventoryItem;
  bestDebt: Debt | null;
  currentUser: { uid: string; displayName?: string | null } | null;
  onSell: (id: string, soldFor: number) => void;
  onDelete: (id: string) => void;
  onListPublic: (item: InventoryItem, price: number, phone: string, negotiable: boolean) => Promise<void>;
}

function ItemCard({ item, bestDebt, currentUser, onSell, onDelete, onListPublic }: ItemCardProps) {
  const [showSellModal, setShowSellModal] = useState(false);
  const value = item.customValue ?? item.estimatedValue;

  const remaining = bestDebt ? debtRemaining(bestDebt) : 0;
  const debtImpact = bestDebt && remaining > 0
    ? Math.round((value / remaining) * 100)
    : null;

  if (item.status === 'sold') {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-4 flex items-center gap-3 opacity-70">
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground/80 line-through">{item.name}</p>
          <p className="text-xs text-green-400">
            ✅ Vendido por {formatBRL(item.soldFor ?? value)} · +100 XP
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-[#211a11] p-4 space-y-3 hover:border-green-500/20 transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{CATEGORY_ICONS[item.category as InventoryCategory]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
              <RarityBadge rarity={rarityForValue(value)} />
              {item.status === 'listed' && (
                <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2 py-0.5">
                  🏪 Na Loja
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70">
              {CATEGORY_LABELS[item.category as InventoryCategory]}
              {item.condition ? ` · ${CONDITION_LABELS[item.condition]}` : ''}
            </p>
            <p className="text-sm font-bold text-amber-400 mt-0.5">{formatBRL(value)}</p>
          </div>
          <button
            onClick={() => onDelete(item.id)}
            className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {bestDebt && debtImpact !== null && (
          <div className="flex items-center gap-2 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
            <span className="text-red-400">⚔️</span>
            <span className="text-red-300">
              Dano no Boss <span className="font-bold">{bestDebt.creditor}</span>:{' '}
              <span className="font-bold">{debtImpact}% do HP</span>
            </span>
          </div>
        )}

        <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">
            ⚡ MISSÃO ESPECIAL
          </p>
          <p className="text-xs text-foreground/80">
            Vender <span className="font-semibold">{item.name}</span> → Recompensa: ~{formatBRL(value)}
            {bestDebt ? ` → ${debtImpact}% do Boss ${bestDebt.creditor}` : ''}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">+100 XP ao concluir</p>
        </div>

        <button
          onClick={() => setShowSellModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold hover:bg-green-500/30 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Vender / Anunciar
        </button>
      </div>

      {showSellModal && (
        <SellModal
          item={item}
          bestDebt={bestDebt}
          currentUser={currentUser}
          onClose={() => setShowSellModal(false)}
          onListPublic={async (price, phone, negotiable) => {
            await onListPublic(item, price, phone, negotiable);
          }}
          onMarkSold={(soldFor) => onSell(item.id, soldFor)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────



// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────

export function Inventory() {
  const { user, profile } = useStore();
  const { data: items = [], loading } = useUserCollection<InventoryItem>('inventory');
  const { data: debts } = useDebts();
  const [showForm, setShowForm] = useState(false);

  const bestDebt = useMemo(() => getHighestInterestDebt(debts), [debts]);
  const availableItems = items.filter((i) => i.status !== 'sold');
  const soldItems = items.filter((i) => i.status === 'sold');
  const totalPotential = availableItems.reduce((s, i) => s + (i.customValue ?? i.estimatedValue), 0);

  async function handleAdd(item: Omit<InventoryItem, 'id'>) {
    if (!user) return;
    await addUserDoc('inventory', item);
    setShowForm(false);
  }

  async function handleSell(id: string, soldFor: number) {
    const item = items.find((i) => i.id === id);
    await updateUserDoc('inventory', id, {
      status: 'sold',
      soldAt: new Date().toISOString(),
      soldFor,
    });
    // Remove from marketplace if was listed
    if (item?.marketplaceId) {
      await updatePublicDoc('marketplace', item.marketplaceId, { status: 'sold' }).catch(() => null);
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    await deleteUserDoc('inventory', id);
    if (item?.marketplaceId) {
      await deletePublicDoc('marketplace', item.marketplaceId).catch(() => null);
    }
  }

  async function handleListPublic(item: InventoryItem, price: number, phone: string, negotiable: boolean) {
    if (!user) return;
    const alias = user.displayName?.split(' ')[0] || 'Aventureiro';
    const catKey = item.category as InventoryCategory;
    const sellerClass = profile?.characterClass ? getClass(profile.characterClass)?.name ?? null : null;
    const sellerLevel = profile?.xp != null ? levelFromXP(profile.xp) : null;
    const ref = await addPublicDoc('marketplace', {
      itemId: item.id,
      userId: user.uid,
      userAlias: alias,
      itemName: item.name,
      category: CATEGORY_LABELS[catKey],
      categoryIcon: CATEGORY_ICONS[catKey],
      price,
      whatsappLink: phone.trim() || null,
      listedAt: new Date().toISOString(),
      status: 'active',
      rarity: rarityForValue(price),
      condition: item.condition ?? null,
      description: item.description ?? null,
      listingType: negotiable ? 'negotiable' : 'fixed',
      sellerClass,
      sellerLevel,
    });
    await updateUserDoc('inventory', item.id, {
      status: 'listed',
      marketplaceId: ref.id,
    });
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-amber-950/30 via-[#211a11] to-[#211a11] p-5 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
            <Package className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Inventário</h1>
            <p className="text-xs text-muted-foreground/70">Seus itens → Missões de venda → Ouro real</p>
          </div>
        </div>

        {availableItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#1a130b] border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Itens disponíveis</p>
              <p className="text-xl font-bold text-foreground">{availableItems.length}</p>
            </div>
            <div className="bg-[#1a130b] border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Potencial de venda</p>
              <p className="text-xl font-bold text-amber-400">{formatBRL(totalPotential)}</p>
            </div>
          </div>
        )}

        {bestDebt && totalPotential > 0 && (
          <div className="flex items-center gap-2 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2.5">
            <span>⚔️</span>
            <span className="text-red-300">
              Vender tudo causaria{' '}
              <span className="font-bold">
                {Math.min(100, Math.round((totalPotential / debtRemaining(bestDebt)) * 100))}%
              </span>{' '}
              de dano no Boss <span className="font-bold">{bestDebt.creditor}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── My Inventory ── */}
      {showForm ? (
            <AddItemForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-500/20 py-4 text-sm font-semibold text-green-500 hover:border-green-500/40 hover:bg-green-500/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar item ao Inventário
            </button>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 rounded-xl border border-border bg-[#211a11] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && availableItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <span className="text-amber-400">⚡</span>
                Missões ativas ({availableItems.length})
              </h2>
              {availableItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  bestDebt={bestDebt}
                  currentUser={user}
                  onSell={handleSell}
                  onDelete={handleDelete}
                  onListPublic={handleListPublic}
                />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <span className="text-5xl">📦</span>
              <p className="font-bold text-foreground">Inventário vazio</p>
              <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                Adicione itens que você tem em casa — TV, celular, móveis — e o sistema vai gerar missões de venda para atacar seus bosses.
              </p>
            </div>
          )}

          {soldItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-bold text-muted-foreground/70">
                ✅ Vendidos ({soldItems.length})
              </h2>
              {soldItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  bestDebt={null}
                  currentUser={user}
                  onSell={handleSell}
                  onDelete={handleDelete}
                  onListPublic={handleListPublic}
                />
              ))}
            </div>
          )}

          {bestDebt && (
            <Link
              to="/carteira"
              className="flex items-center justify-between rounded-xl border border-red-900/30 bg-red-950/10 px-4 py-3 hover:bg-red-950/20 transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-red-400">☠️ Ver Boss {bestDebt.creditor}</p>
                <p className="text-xs text-muted-foreground/70">
                  {formatBRL(debtRemaining(bestDebt))} restantes
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-red-400 shrink-0" />
            </Link>
          )}

      {/* Mercado da Guilda link */}
      <Link
        to="/mercado"
        className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors"
      >
        <ShoppingBag className="h-6 w-6 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">Mercado da Guilda</p>
          <p className="text-xs text-muted-foreground">Itens de outros aventureiros</p>
        </div>
        <span className="text-amber-400 font-bold text-sm shrink-0">→</span>
      </Link>

    </div>
  );
}
