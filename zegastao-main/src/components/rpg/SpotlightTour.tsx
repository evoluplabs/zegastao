import { useState, useEffect, useLayoutEffect, useCallback, useRef, type CSSProperties } from 'react';
import { X, ChevronRight, ChevronLeft, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpotlightStep {
  /** Seletor CSS do elemento a iluminar. Sem seletor = balão central (intro/encerramento). */
  selector?: string;
  /** Se true, o balão não mostra "Próximo" — só avança quando o usuário clica no elemento real. */
  requiresClick?: boolean;
  emoji: string;
  title: string;
  body: string;
}

export type TourAccent = 'green' | 'gold';

interface Props {
  steps: SpotlightStep[];
  /** Chamado ao concluir, pular ou fechar (clique fora). */
  onClose: () => void;
  /** Narrador opcional (companion): mostra avatar + "{name} diz:" no topo do balão. */
  narrator?: { emoji: string; name: string };
  accent?: TourAccent;
  /** Texto do botão final. */
  finishLabel?: string;
}

const PAD = 10;
interface Rect { top: number; left: number; width: number; height: number; }

const ACCENT: Record<TourAccent, { ring: string; button: string; bar: string; clickBox: string; clickText: string; clickIcon: string }> = {
  green: {
    ring: 'border-green-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]',
    button: 'bg-green-500 text-stone-950 hover:bg-green-400',
    bar: 'bg-green-400',
    clickBox: 'border-green-500/30 bg-green-500/10',
    clickText: 'text-green-300',
    clickIcon: 'text-green-400',
  },
  gold: {
    ring: 'border-gold shadow-[0_0_0_4px_rgba(245,158,11,0.25)]',
    button: 'bg-gold text-gold-foreground hover:brightness-110',
    bar: 'bg-gold',
    clickBox: 'border-gold/30 bg-gold/10',
    clickText: 'text-gold',
    clickIcon: 'text-gold',
  },
};

/**
 * Tour com spotlight: escurece a tela e recorta um "buraco" iluminado ao redor do
 * elemento-alvo (medido em tempo real), com anel pulsante + balão reposicionável.
 * Mecânica extraída do tour das Raids; reutilizável em qualquer tela via `data-tour`.
 * Renderize este componente apenas quando o tour deve estar ativo — o pai controla isso.
 */
export function SpotlightTour({ steps, onClose, narrator, accent = 'green', finishLabel = 'Entendi! 🎉' }: Props) {
  const theme = ACCENT[accent];
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Encontra o próximo passo cujo seletor existe no DOM (adapta ao estado da tela).
  const resolveStep = useCallback((from: number, dir: 1 | -1): number => {
    let i = from;
    while (i >= 0 && i < steps.length) {
      const s = steps[i];
      if (!s.selector || document.querySelector(s.selector)) return i;
      i += dir;
    }
    return -1;
  }, [steps]);

  // Resolve o primeiro passo válido ao montar.
  useEffect(() => {
    const first = resolveStep(0, 1);
    if (first >= 0) setStep(first);
  }, [resolveStep]);

  // Mede o elemento alvo e remede em resize/scroll.
  useLayoutEffect(() => {
    const sel = steps[step]?.selector;
    if (!sel) { setRect(null); return; }

    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    function measure() {
      const target = sel ? document.querySelector(sel) : null;
      if (!target) { setRect(null); return; }
      const r = target.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, steps]);

  const nextRef = useRef<() => void>(() => {});
  function next() {
    const n = resolveStep(step + 1, 1);
    if (n >= 0) setStep(n); else onClose();
  }
  function prev() {
    const p = resolveStep(step - 1, -1);
    if (p >= 0) setStep(p);
  }
  nextRef.current = next;

  // Passos com requiresClick: escuta o clique no elemento real e avança (clique propaga).
  useEffect(() => {
    const current = steps[step];
    if (!current?.requiresClick || !current?.selector) return;
    const el = document.querySelector(current.selector);
    if (!el) return;
    const handler = () => nextRef.current();
    el.addEventListener('click', handler, { once: true });
    return () => el.removeEventListener('click', handler);
  }, [step, steps]);

  const current = steps[step];
  if (!current) return null;

  const isLast = resolveStep(step + 1, 1) < 0;
  const isFirst = resolveStep(step - 1, -1) < 0;
  const requiresClick = !!current.requiresClick;

  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const MASK = 'fixed bg-stone-950/80 z-50';

  let tipStyle: CSSProperties;
  if (!hole) {
    tipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: Math.min(340, W - 24) };
  } else {
    const tipW = Math.min(340, W - 24);
    const left = Math.min(Math.max(12, hole.left + hole.width / 2 - tipW / 2), W - tipW - 12);
    const below = hole.top + hole.height + 12;
    const placeBelow = below + 280 < H || hole.top < 200;
    tipStyle = placeBelow
      ? { position: 'fixed', top: below, left, width: tipW }
      : { position: 'fixed', top: Math.max(12, hole.top - 12), left, width: tipW, transform: 'translateY(-100%)' };
  }

  const total = steps.length;

  return (
    <>
      {/* Máscara escura com "buraco" no elemento alvo */}
      {hole ? (
        <>
          <div className={MASK} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onClick={onClose} />
          <div className={MASK} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} onClick={onClose} />
          <div className={MASK} style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onClick={onClose} />
          <div className={MASK} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} onClick={onClose} />
          {/* Anel animado ao redor do alvo */}
          <div
            className={cn('pointer-events-none fixed z-50 rounded-2xl border-2 animate-pulse', theme.ring)}
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Balão */}
      <div className="z-[60] rounded-2xl border border-border bg-card p-4 shadow-2xl" style={tipStyle}>
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Narrador (companion) */}
        {narrator ? (
          <div className="mb-2 flex items-center gap-2 pr-6">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <span className="text-xl companion-idle">{narrator.emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{narrator.name} diz:</p>
              <h3 className="text-sm font-bold text-foreground leading-tight truncate">{current.title}</h3>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">{current.emoji}</span>
            </div>
            <h3 className="mb-1 pr-6 text-base font-bold text-foreground">{current.title}</h3>
          </>
        )}

        <p className="mb-3 flex gap-2 text-sm leading-relaxed text-muted-foreground">
          {narrator && <span className="shrink-0 text-xl">{current.emoji}</span>}
          <span>{current.body}</span>
        </p>

        {/* Indicação de clique obrigatório */}
        {requiresClick && (
          <div className={cn('mb-3 flex items-center gap-2 rounded-xl border px-3 py-2', theme.clickBox)}>
            <MousePointerClick className={cn('h-4 w-4 shrink-0', theme.clickIcon)} />
            <p className={cn('text-xs font-semibold', theme.clickText)}>Toque no elemento destacado para continuar</p>
          </div>
        )}

        {/* Barra de progresso */}
        <div className="mb-3 flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= step ? theme.bar : 'bg-border')} />
          ))}
        </div>

        {/* Navegação — só mostra "Próximo" quando não é click-to-advance */}
        {!requiresClick && (
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={prev} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={next}
              className={cn('flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-bold', theme.button)}
            >
              {isLast ? finishLabel : <>Próximo <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {isFirst && (
          <button onClick={onClose} className="mt-2 w-full text-center text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
            Pular tour
          </button>
        )}
      </div>
    </>
  );
}
