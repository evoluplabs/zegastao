import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Package, Trash2, CheckCircle2, ArrowRight,
  Share2, Store, X, Copy, Check, Phone, Zap, ShoppingBag,
  MessageCircle,
} from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { useStore } from '@/store/useStore';
import { useUserCollection, usePublicCollection } from '@/hooks/useCollection';
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
  type InventoryCategory,
} from '@/lib/inventorySuggestions';
import type { InventoryItem, Debt, MarketplaceListing } from '@/types';

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
  onListPublic: (price: number, phone: string) => Promise<void>;
  onMarkSold: (soldFor: number) => void;
}

function SellModal({ item, bestDebt, currentUser, onClose, onListPublic, onMarkSold }: SellModalProps) {
  const value = item.customValue ?? item.estimatedValue;
  const [mode, setMode] = useState<'choose' | 'quick' | 'market'>('choose');
  const [price, setPrice] = useState(String(value));
  const [phone, setPhone] = useState('');
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
    await onListPublic(finalPrice, phone);
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
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2d3e] bg-[#1a1d27] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <p className="font-bold text-slate-100 text-sm">{item.name}</p>
              <p className="text-xs text-amber-400">{formatBRL(value)} estimado</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Mode picker */}
          {mode === 'choose' && (
            <>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Como vender?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('quick')}
                  className="rounded-xl border border-[#2a2d3e] bg-[#141720] p-4 text-left hover:border-amber-500/40 transition-colors"
                >
                  <Zap className="h-5 w-5 text-amber-400 mb-2" />
                  <p className="font-bold text-sm text-slate-100">Vender Rápido</p>
                  <p className="text-[11px] text-slate-500 mt-1">Plataformas de revenda — dinheiro em dias</p>
                </button>
                <button
                  onClick={() => setMode('market')}
                  className="rounded-xl border border-[#2a2d3e] bg-[#141720] p-4 text-left hover:border-emerald-500/40 transition-colors"
                >
                  <Store className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="font-bold text-sm text-slate-100">Anunciar no Mercado</p>
                  <p className="text-[11px] text-slate-500 mt-1">WhatsApp + Loja da Guilda — você define o preço</p>
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
              <button onClick={() => setMode('choose')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
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
                      className="flex items-center justify-between rounded-xl border border-[#2a2d3e] bg-[#141720] px-4 py-3 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{p.emoji}</span>
                        <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">Anunciar →</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2a2d3e] pt-4">
                <p className="text-xs text-slate-500 mb-3">Já vendeu? Registre para ganhar XP:</p>
                {!confirmSold ? (
                  <button
                    onClick={() => setConfirmSold(true)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                  >
                    ✅ Marcar como vendido → +100 XP
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Por quanto vendeu?</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">R$</span>
                      <input
                        value={soldFor}
                        onChange={(e) => setSoldFor(e.target.value)}
                        placeholder={String(value)}
                        className="flex-1 rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                        inputMode="decimal"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmSold}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                      >
                        🎉 Confirmar!
                      </button>
                      <button onClick={() => setConfirmSold(false)} className="px-4 py-2.5 rounded-xl border border-[#2a2d3e] text-xs text-slate-500 hover:bg-[#1e2235]">
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
              <button onClick={() => setMode('choose')} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                ← Voltar
              </button>

              {/* Price */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Preço por unidade</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-semibold">R$</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 rounded-xl border border-[#2a2d3e] bg-[#0f1117] px-4 py-3 text-lg font-bold text-slate-100 focus:outline-none focus:border-emerald-500/50"
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
              <div className="rounded-xl bg-[#141720] border border-[#2a2d3e] p-4">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-bold mb-2">Prévia do anúncio</p>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{announcementText}</pre>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#2a2d3e] bg-[#141720] text-slate-300 text-sm font-semibold hover:bg-[#1e2235] transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
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
                  className="py-2.5 text-center rounded-xl border border-[#2a2d3e] text-xs text-slate-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                  🛒 OLX
                </a>
                <a href="https://www.facebook.com/marketplace/" target="_blank" rel="noopener noreferrer"
                  className="py-2.5 text-center rounded-xl border border-[#2a2d3e] text-xs text-slate-400 hover:border-sky-500/30 hover:text-sky-400 transition-colors">
                  📘 Facebook
                </a>
              </div>

              {/* Guild store listing */}
              <div className="border border-[#2a2d3e] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-slate-200">Loja da Guilda</p>
                  {listed && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                      ✅ Listado
                    </span>
                  )}
                </div>
                {!listed ? (
                  <>
                    <p className="text-xs text-slate-500">
                      Liste publicamente para que outros aventureiros vejam e entrem em contato. Opcional: adicione seu WhatsApp para contato direto.
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="WhatsApp (opcional, ex: 11999998888)"
                        className="flex-1 rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                        type="tel"
                      />
                    </div>
                    <button
                      onClick={handleListPublic}
                      disabled={listing}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      {listing ? 'Listando...' : '🏪 Listar na Loja da Guilda'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
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
    <div className="rounded-xl border border-primary/30 bg-[#1a1d27] p-4 space-y-4">
      <h3 className="font-bold text-sm text-slate-100">+ Novo item no Inventário</h3>

      <div>
        <p className="text-xs text-slate-500 mb-2">Categoria</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                category === cat
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                  : 'border-[#2a2d3e] text-slate-400 hover:border-emerald-500/40'
              )}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1">Nome do item</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='ex: TV Samsung 32"'
          className="w-full rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
        />
        {name.length < 2 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INVENTORY_SUGGESTIONS.filter((s) => s.category === category).slice(0, 5).map((s) => (
              <button
                key={s.name}
                onClick={() => setName(s.name)}
                className="text-[11px] px-2 py-1 rounded-md border border-[#2a2d3e] text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1">
          Valor estimado {suggestion ? `(sugestão: ${formatBRL(suggestion.minValue)}–${formatBRL(suggestion.maxValue)})` : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">R$</span>
          <input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={estimV > 0 ? String(estimV) : 'ex: 350'}
            className="flex-1 rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
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
          className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Adicionar ao Inventário
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-[#2a2d3e] text-slate-500 text-sm hover:bg-[#1e2235] transition-colors"
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
  onListPublic: (item: InventoryItem, price: number, phone: string) => Promise<void>;
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
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 flex items-center gap-3 opacity-70">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-300 line-through">{item.name}</p>
          <p className="text-xs text-emerald-400">
            ✅ Vendido por {formatBRL(item.soldFor ?? value)} · +100 XP
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-4 space-y-3 hover:border-emerald-500/20 transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{CATEGORY_ICONS[item.category as InventoryCategory]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-100">{item.name}</h3>
              {item.status === 'listed' && (
                <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2 py-0.5">
                  🏪 Na Loja
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{CATEGORY_LABELS[item.category as InventoryCategory]}</p>
            <p className="text-sm font-bold text-amber-400 mt-0.5">{formatBRL(value)}</p>
          </div>
          <button
            onClick={() => onDelete(item.id)}
            className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
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
          <p className="text-xs text-slate-300">
            Vender <span className="font-semibold">{item.name}</span> → Recompensa: ~{formatBRL(value)}
            {bestDebt ? ` → ${debtImpact}% do Boss ${bestDebt.creditor}` : ''}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">+100 XP ao concluir</p>
        </div>

        <button
          onClick={() => setShowSellModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-colors"
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
          onListPublic={async (price, phone) => {
            await onListPublic(item, price, phone);
          }}
          onMarkSold={(soldFor) => onSell(item.id, soldFor)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  MarketplaceCard — community listing
// ─────────────────────────────────────────────

function MarketplaceCard({ listing }: { listing: MarketplaceListing }) {
  const waUrl = listing.whatsappLink
    ? `https://wa.me/${listing.whatsappLink.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi seu anúncio de *${listing.itemName}* por ${formatBRL(listing.price)} na Loja da Guilda do Zé Gastão. Ainda está disponível?`)}`
    : null;

  return (
    <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{listing.categoryIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-100">{listing.itemName}</p>
          <p className="text-xs text-slate-500">{listing.category} · {listing.userAlias}</p>
        </div>
        <p className="text-sm font-extrabold text-amber-400 shrink-0">{formatBRL(listing.price)}</p>
      </div>

      {waUrl ? (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20c05c] transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Contatar via WhatsApp
        </a>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#2a2d3e] text-slate-500 text-xs">
          Sem contato direto · Busque no OLX
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────

export function Inventory() {
  const { user } = useStore();
  const { data: items = [], loading } = useUserCollection<InventoryItem>('inventory');
  const { data: listings = [], loading: listingsLoading } = usePublicCollection<MarketplaceListing>(
    'marketplace',
    [orderBy('listedAt', 'desc')]
  );
  const { data: debts } = useDebts();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'inventory' | 'store'>('inventory');

  const bestDebt = useMemo(() => getHighestInterestDebt(debts), [debts]);
  const availableItems = items.filter((i) => i.status !== 'sold');
  const soldItems = items.filter((i) => i.status === 'sold');
  const totalPotential = availableItems.reduce((s, i) => s + (i.customValue ?? i.estimatedValue), 0);
  const activeListings = listings.filter((l) => l.status === 'active');

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

  async function handleListPublic(item: InventoryItem, price: number, phone: string) {
    if (!user) return;
    const alias = user.displayName?.split(' ')[0] || 'Aventureiro';
    const catKey = item.category as InventoryCategory;
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
    });
    await updateUserDoc('inventory', item.id, {
      status: 'listed',
      marketplaceId: ref.id,
    });
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-xl border border-[#2a2d3e] bg-gradient-to-br from-amber-950/30 via-[#1a1d27] to-[#1a1d27] p-5 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center">
            <Package className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Inventário</h1>
            <p className="text-xs text-slate-500">Seus itens → Missões de venda → Ouro real</p>
          </div>
        </div>

        {availableItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#141720] border border-[#2a2d3e] rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Itens disponíveis</p>
              <p className="text-xl font-bold text-slate-100">{availableItems.length}</p>
            </div>
            <div className="bg-[#141720] border border-[#2a2d3e] rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Potencial de venda</p>
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

      {/* Tab bar */}
      <div className="flex rounded-xl border border-[#2a2d3e] overflow-hidden bg-[#141720]">
        <button
          onClick={() => setTab('inventory')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
            tab === 'inventory'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Package className="h-4 w-4" />
          Meu Inventário
          {availableItems.length > 0 && (
            <span className={cn(
              'text-[10px] rounded-full px-1.5 font-bold',
              tab === 'inventory' ? 'bg-slate-950/30 text-slate-950' : 'bg-[#2a2d3e] text-slate-400'
            )}>
              {availableItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('store')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
            tab === 'store'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <Store className="h-4 w-4" />
          Loja da Guilda
          {activeListings.length > 0 && (
            <span className={cn(
              'text-[10px] rounded-full px-1.5 font-bold',
              tab === 'store' ? 'bg-slate-950/30 text-slate-950' : 'bg-[#2a2d3e] text-slate-400'
            )}>
              {activeListings.length}
            </span>
          )}
        </button>
      </div>

      {/* ── My Inventory tab ── */}
      {tab === 'inventory' && (
        <>
          {showForm ? (
            <AddItemForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/20 py-4 text-sm font-semibold text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar item ao Inventário
            </button>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && availableItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
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
              <p className="font-bold text-slate-100">Inventário vazio</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Adicione itens que você tem em casa — TV, celular, móveis — e o sistema vai gerar missões de venda para atacar seus bosses.
              </p>
            </div>
          )}

          {soldItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-bold text-slate-500">
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
                <p className="text-xs text-slate-500">
                  {formatBRL(debtRemaining(bestDebt))} restantes
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-red-400 shrink-0" />
            </Link>
          )}
        </>
      )}

      {/* ── Guild Store tab ── */}
      {tab === 'store' && (
        <>
          <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-400" />
              <p className="font-bold text-sm text-slate-100">Loja da Guilda</p>
            </div>
            <p className="text-xs text-slate-500">
              Compre e venda itens com outros aventureiros. Contato direto via WhatsApp — sem taxas.
            </p>
          </div>

          {listingsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] animate-pulse" />
              ))}
            </div>
          )}

          {!listingsLoading && activeListings.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <span className="text-5xl">🏪</span>
              <p className="font-bold text-slate-100">Mercado vazio</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Ainda não há itens anunciados. Seja o primeiro — vá até "Meu Inventário" e liste um item na Loja da Guilda.
              </p>
              <button
                onClick={() => setTab('inventory')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-colors"
              >
                <Package className="h-4 w-4" />
                Ir para Meu Inventário
              </button>
            </div>
          )}

          {!listingsLoading && activeListings.length > 0 && (
            <div className="space-y-3">
              {activeListings.map((listing) => (
                <MarketplaceCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
