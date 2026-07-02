import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, Tag, Package, MessageCircle, ExternalLink,
} from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { usePublicCollection } from '@/hooks/useCollection';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS, CATEGORY_ICONS, rarityForValue,
  RARITY_META, RARITY_ORDER, CONDITION_LABELS,
  type InventoryCategory, type Rarity,
} from '@/lib/inventorySuggestions';
import type { MarketplaceListing } from '@/types';

// ─── NPC Feirante flavor lines (deterministic by day index) ─────────────────
const FEIRANTE_LINES = [
  'Boa compra é a que serve. Ruim é a que encosta.',
  'Aventureiro, teu próximo tesouro pode estar aqui!',
  'Item raro não fica parado no baú. Troca por ouro!',
  'Comprador honesto, vendedor feliz. Essa é a lei da Guilda.',
  'Cada item tem sua história. Qual a sua hoje?',
  'A melhor negociação é a que os dois saem sorrindo.',
  'Mercado cheio, sinal de guilda próspera!',
];
function dailyFeiranteLine() {
  const day = Math.floor(Date.now() / 86400000);
  return FEIRANTE_LINES[day % FEIRANTE_LINES.length];
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function listingRarity(l: MarketplaceListing): Rarity {
  return l.rarity ?? rarityForValue(l.price);
}

function listingWaUrl(listing: MarketplaceListing, offerMsg?: string): string | null {
  if (!listing.whatsappLink) return null;
  const digits = listing.whatsappLink.replace(/\D/g, '');
  const text = offerMsg
    ? offerMsg
    : listing.listingType === 'negotiable'
    ? `Olá! Vi seu anúncio de *${listing.itemName}* (${formatBRL(listing.price)}) no Mercado da Guilda do Zé Gastão. Gostaria de fazer uma proposta — ainda está disponível?`
    : `Olá! Vi seu anúncio de *${listing.itemName}* por ${formatBRL(listing.price)} no Mercado da Guilda do Zé Gastão. Ainda está disponível?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// ─── SellerCard ──────────────────────────────────────────────────────────────
function SellerCard({ listing }: { listing: MarketplaceListing }) {
  const classEmoji: Record<string, string> = {
    Guardião: '🛡️', Caçador: '🏹', Mercador: '💰', Arcano: '✨',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
        {classEmoji[listing.sellerClass ?? ''] ?? '🧑'}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{listing.userAlias}</p>
        {listing.sellerClass && (
          <p className="text-[11px] text-muted-foreground">
            {listing.sellerClass}
            {listing.sellerLevel ? ` · Lv ${listing.sellerLevel}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── OfferModal ──────────────────────────────────────────────────────────────
function OfferModal({ listing, onClose }: { listing: MarketplaceListing; onClose: () => void }) {
  const [offer, setOffer] = useState('');
  const offerNum = parseFloat(offer.replace(',', '.')) || 0;
  const msg = offer
    ? `Olá! Vi seu item '${listing.itemName}' no Mercado da Guilda por ${formatBRL(listing.price)}. Minha proposta: R$ ${offer.replace(',', '.')}. Ainda está disponível?`
    : '';
  const waUrl = offerNum > 0 ? listingWaUrl(listing, msg) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-8" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground">💬 Fazer proposta</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Preço pedido: <span className="font-bold text-foreground">{formatBRL(listing.price)}</span></p>
          <input
            type="number"
            min={1}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="Sua oferta em R$"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none text-sm"
          />
        </div>
        {msg && (
          <div className="rounded-xl bg-secondary/50 border border-border p-3 text-xs text-foreground/80 leading-relaxed">
            {msg}
          </div>
        )}
        <a
          href={waUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={!waUrl ? (e) => e.preventDefault() : undefined}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors',
            waUrl
              ? 'bg-green-500 text-stone-950 hover:bg-green-400'
              : 'bg-secondary text-muted-foreground cursor-not-allowed'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Enviar proposta via WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── InspectModal ────────────────────────────────────────────────────────────
function InspectModal({ listing, onClose }: { listing: MarketplaceListing; onClose: () => void }) {
  const [showOffer, setShowOffer] = useState(false);
  const rarity = listingRarity(listing);
  const meta = RARITY_META[rarity];
  const waUrl = listingWaUrl(listing);
  const condition = listing.condition ? CONDITION_LABELS[listing.condition] : null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-8" onClick={onClose}>
        <div
          className={cn('w-full max-w-sm rounded-2xl border bg-card overflow-hidden', meta.border)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rarity header */}
          <div className={cn('px-5 py-3 flex items-center gap-2', meta.bg)}>
            <span className="text-xl">{listing.categoryIcon}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('font-bold text-sm truncate', meta.text)}>{listing.itemName}</p>
              <p className="text-[11px] text-muted-foreground">{listing.category}</p>
            </div>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', meta.text, meta.border, meta.bg)}>
              {meta.emoji} {meta.label}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Price + tags */}
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-foreground">{formatBRL(listing.price)}</p>
              <div className="flex items-center gap-1.5">
                {condition && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                    {condition}
                  </span>
                )}
                {listing.listingType === 'negotiable' && (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                    💬 Negociável
                  </span>
                )}
              </div>
            </div>

            {listing.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            )}

            {/* Seller profile */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Vendedor</p>
              <SellerCard listing={listing} />
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2">
              {listing.listingType === 'negotiable' && (
                <button
                  onClick={() => setShowOffer(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
                >
                  💬 Proposta
                </button>
              )}
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-green-400 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : (
                <p className="flex-1 text-center text-xs text-muted-foreground py-2.5">Sem contato disponível</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showOffer && <OfferModal listing={listing} onClose={() => setShowOffer(false)} />}
    </>
  );
}

// ─── MarketItemCard ──────────────────────────────────────────────────────────
function MarketItemCard({ listing, onInspect }: { listing: MarketplaceListing; onInspect: (l: MarketplaceListing) => void }) {
  const rarity = listingRarity(listing);
  const meta = RARITY_META[rarity];
  const condition = listing.condition ? CONDITION_LABELS[listing.condition] : null;

  return (
    <button
      onClick={() => onInspect(listing)}
      className={cn(
        'w-full text-left rounded-xl border bg-card p-3.5 transition-all hover:shadow-md active:scale-[0.99]',
        meta.border,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0', meta.bg)}>
          {listing.categoryIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="font-bold text-sm text-foreground leading-tight truncate">{listing.itemName}</p>
            <p className="font-bold text-sm text-foreground shrink-0">{formatBRL(listing.price)}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{listing.category}</span>
            {condition && (
              <span className="text-[10px] text-muted-foreground/70">· {condition}</span>
            )}
            {listing.listingType === 'negotiable' && (
              <span className="text-[10px] font-bold text-amber-500">· 💬 Negociável</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={cn('text-[10px] font-bold', meta.text)}>{meta.emoji} {meta.label}</span>
            <span className="text-[10px] text-muted-foreground">{listing.userAlias}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Mercado page ─────────────────────────────────────────────────────────────
export function Mercado() {
  const { data: listings = [], loading } = usePublicCollection<MarketplaceListing>(
    'marketplace',
    [orderBy('listedAt', 'desc')]
  );

  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [rarFilter, setRarFilter] = useState<Set<Rarity>>(new Set());
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<'recent' | 'price_asc' | 'price_desc' | 'rarity'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [inspecting, setInspecting] = useState<MarketplaceListing | null>(null);

  const activeListings = useMemo(() => listings.filter((l) => l.status === 'active'), [listings]);
  const filtersActive = q.trim() !== '' || catFilter.size > 0 || rarFilter.size > 0 || priceMin !== '' || priceMax !== '';

  function toggleSet<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const filteredListings = useMemo(() => {
    const min = priceMin ? parseFloat(priceMin.replace(',', '.')) : -Infinity;
    const max = priceMax ? parseFloat(priceMax.replace(',', '.')) : Infinity;
    const ql = q.trim().toLowerCase();
    let out = activeListings.filter((l) => {
      if (ql && !l.itemName.toLowerCase().includes(ql)) return false;
      if (catFilter.size && !catFilter.has(l.category)) return false;
      if (rarFilter.size && !rarFilter.has(listingRarity(l))) return false;
      if (l.price < min || l.price > max) return false;
      return true;
    });
    out = [...out];
    if (sort === 'price_asc') out.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') out.sort((a, b) => b.price - a.price);
    else if (sort === 'rarity') out.sort((a, b) => RARITY_ORDER.indexOf(listingRarity(b)) - RARITY_ORDER.indexOf(listingRarity(a)));
    return out;
  }, [activeListings, q, catFilter, rarFilter, priceMin, priceMax, sort]);

  return (
    <div className="space-y-4 pb-24">

      {/* Feirante NPC Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-3xl shrink-0">
            🪙
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">Mercado da Guilda</h1>
            <p className="text-xs text-muted-foreground">Itens reais de aventureiros — sem taxa, contato direto.</p>
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5">
          <p className="text-sm text-amber-600 dark:text-amber-400 italic leading-snug">
            🗣️ "{dailyFeiranteLine()}"
          </p>
          <p className="text-[10px] text-amber-500/70 mt-0.5">— Feirante da Guilda</p>
        </div>
        <Link
          to="/inventario"
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
        >
          <Package className="h-4 w-4" />
          Listar meu item
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </Link>
      </div>

      {/* Search + Filters toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar item..."
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-muted-foreground/70 hover:text-foreground/80">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
            filtersActive || showFilters
              ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
              : 'border-border text-muted-foreground'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {filtersActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {/* Category */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Categoria
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((cat) => {
                const label = CATEGORY_LABELS[cat];
                const active = catFilter.has(label);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleSet(catFilter, label, setCatFilter)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors',
                      active
                        ? 'bg-green-500 text-stone-950 border-green-500'
                        : 'border-border text-muted-foreground hover:border-green-500/40'
                    )}
                  >
                    {CATEGORY_ICONS[cat]} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rarity */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Qualidade</p>
            <div className="flex flex-wrap gap-2">
              {RARITY_ORDER.map((r) => {
                const m = RARITY_META[r];
                const active = rarFilter.has(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleSet(rarFilter, r, setRarFilter)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                      active
                        ? cn(m.text, m.border, m.bg, 'font-bold')
                        : 'border-border text-muted-foreground hover:border-border/70'
                    )}
                  >
                    {m.emoji} {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Preço (R$)</p>
            <div className="flex items-center gap-2">
              <input
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="mín"
                inputMode="decimal"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-muted-foreground/50">—</span>
              <input
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="máx"
                inputMode="decimal"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Ordenar por</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['recent', 'Mais recente'],
                ['price_asc', 'Menor preço'],
                ['price_desc', 'Maior preço'],
                ['rarity', 'Raridade'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    sort === key
                      ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold'
                      : 'border-border text-muted-foreground hover:border-amber-500/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtersActive && (
            <button
              onClick={() => { setQ(''); setCatFilter(new Set()); setRarFilter(new Set()); setPriceMin(''); setPriceMax(''); }}
              className="text-xs text-muted-foreground/70 hover:text-foreground/80 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Listings count */}
      {!loading && activeListings.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'itens'}
          {filtersActive ? ' encontrados' : ' disponíveis'}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-secondary/20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeListings.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl">🏪</span>
          <p className="font-bold text-foreground">Mercado vazio por hoje</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Seja o primeiro — vá ao Inventário e liste um item para a guilda.
          </p>
          <Link
            to="/inventario"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500 text-sm font-bold hover:bg-amber-500/30 transition-colors"
          >
            <Package className="h-4 w-4" />
            Ir para Meu Inventário
          </Link>
        </div>
      )}

      {/* No results with filters */}
      {!loading && activeListings.length > 0 && filteredListings.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-muted-foreground">Nenhum item encontrado com esses filtros.</p>
          <button
            onClick={() => { setQ(''); setCatFilter(new Set()); setRarFilter(new Set()); setPriceMin(''); setPriceMax(''); }}
            className="text-xs text-primary underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && filteredListings.length > 0 && (
        <div className="space-y-2">
          {filteredListings.map((l) => (
            <MarketItemCard key={l.id} listing={l} onInspect={setInspecting} />
          ))}
        </div>
      )}

      {/* InspectModal */}
      {inspecting && <InspectModal listing={inspecting} onClose={() => setInspecting(null)} />}
    </div>
  );
}
