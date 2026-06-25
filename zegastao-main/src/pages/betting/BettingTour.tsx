import { useState, useEffect, useLayoutEffect, useCallback, useRef, type CSSProperties } from 'react';
import { X, HelpCircle, ChevronRight, ChevronLeft, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_KEY = 'ze_apostador_tour_v2';

interface TourStep {
  selector?: string;
  // Se true, o balão não mostra "Próximo" — o tour só avança quando o
  // usuário clica no elemento iluminado de verdade.
  requiresClick?: boolean;
  emoji: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    emoji: '👋',
    title: 'Bora dar um tour rápido?',
    body: 'Em menos de 1 minuto você faz sua primeira aposta do zero. Vou te mostrar onde clicar em cada passo. Toca em "Próximo" pra começar.',
  },
  {
    selector: '[data-tour="start"]',
    requiresClick: true,
    emoji: '🚀',
    title: 'Primeiro: toca neste botão',
    body: 'Isso abre a sua rodada de apostas. Você entra com um valor e o Zé te avisa quando sacar ou parar.',
  },
  {
    selector: '[data-tour="banca"]',
    emoji: '💰',
    title: 'Aqui fica o seu dinheiro',
    body: 'Esse valor é quanto você ainda tem pra apostar nesta rodada. A barra verde mostra o quanto falta pra bater a meta que você definiu.',
  },
  {
    selector: '[data-tour="build"]',
    requiresClick: true,
    emoji: '📸',
    title: 'Fotografe um jogo na Betano',
    body: 'Abre a Betano, escolhe qualquer jogo e tira um print. Manda o print — o Zé lê as odds na hora. Quando aparecer o nome do jogo, o botão fica verde: toca nele pra montar sua aposta.',
  },
  {
    selector: '[data-tour="tools"]',
    emoji: '🔍',
    title: 'Desmascarador de guru · extra',
    body: 'Tem alguém mandando bilhete com odds mirabolantes? Cola o print aqui e o Zé mostra a chance real. Não é obrigatório — pode ignorar.',
  },
  {
    selector: '[data-tour="pause"]',
    emoji: '💚',
    title: 'Sempre no controle',
    body: 'Toca aqui se sentir que tá exagerando. O Zé trava tudo por 7 dias. Apostas têm que ser diversão, não sufoco.',
  },
  {
    emoji: '✅',
    title: 'Pronto, agora é com você!',
    body: 'Quando a sua aposta aparecer, confirme ela, leve pro Betano e depois volte aqui pra marcar se ganhou ou perdeu. O Zé aprende com isso. Boa sorte! 🍀',
  },
];

const PAD = 10;
interface Rect { top: number; left: number; width: number; height: number; }

interface Props {
  autoStart?: boolean;
  /** Passa o número de apostas já concluídas (outcome !== 'pending').
   *  Quando chega em 1, o tour é encerrado permanentemente. */
  betsCompleted?: number;
}

export function BettingTour({ autoStart = true, betsCompleted = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Encontra o próximo passo cujo seletor existe no DOM (adapta ao estado da tela).
  const resolveStep = useCallback((from: number, dir: 1 | -1): number => {
    let i = from;
    while (i >= 0 && i < STEPS.length) {
      const s = STEPS[i];
      if (!s.selector || document.querySelector(s.selector)) return i;
      i += dir;
    }
    return -1;
  }, []);

  // Quando o usuário conclui a primeira aposta, encerra o tour permanentemente.
  useEffect(() => {
    if (betsCompleted > 0) {
      localStorage.setItem(TOUR_KEY, 'done');
      setOpen(false);
    }
  }, [betsCompleted]);

  // Auto-inicia na primeira visita (se nunca tiver apostado).
  useEffect(() => {
    if (betsCompleted > 0) return;
    if (autoStart && !localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => {
        const first = resolveStep(0, 1);
        if (first >= 0) { setStep(first); setOpen(true); }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [autoStart, betsCompleted, resolveStep]);

  // Mede o elemento alvo e remede em resize/scroll (sem scroll automático no loop).
  useLayoutEffect(() => {
    if (!open) return;
    const sel = STEPS[step]?.selector;
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
  }, [open, step]);

  // Para passos com requiresClick: escuta o clique no elemento real e avança.
  // O clique propaga normalmente — a ação de verdade (iniciar ciclo, buscar aposta) acontece.
  const nextRef = useRef<() => void>(() => {});
  function close() {
    localStorage.setItem(TOUR_KEY, 'done');
    setOpen(false);
  }
  function next() {
    const n = resolveStep(step + 1, 1);
    if (n >= 0) setStep(n); else close();
  }
  function prev() {
    const p = resolveStep(step - 1, -1);
    if (p >= 0) setStep(p);
  }
  nextRef.current = next;

  useEffect(() => {
    const current = STEPS[step];
    if (!open || !current?.requiresClick || !current?.selector) return;
    const el = document.querySelector(current.selector);
    if (!el) return;
    const handler = () => nextRef.current();
    el.addEventListener('click', handler, { once: true });
    return () => el.removeEventListener('click', handler);
  }, [open, step]);

  function restart() {
    if (betsCompleted > 0) return; // já apostou — tour só via "?"
    const first = resolveStep(0, 1);
    setStep(first >= 0 ? first : 0);
    setOpen(true);
  }

  // Botão flutuante "?" — sempre visível pra rever.
  if (!open) {
    return (
      <button
        onClick={restart}
        title="Rever o tour do Zé"
        className={cn(
          'fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-colors',
          betsCompleted > 0
            ? 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300'
            : 'border-emerald-500/40 bg-slate-900 text-emerald-400 hover:bg-slate-800',
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = resolveStep(step + 1, 1) < 0;
  const isFirst = resolveStep(step - 1, -1) < 0;
  const requiresClick = !!current?.requiresClick;

  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const MASK = 'fixed bg-slate-950/80 z-50';

  let tipStyle: CSSProperties;
  if (!hole) {
    tipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  } else {
    const tipW = Math.min(320, W - 24);
    const left = Math.min(Math.max(12, hole.left + hole.width / 2 - tipW / 2), W - tipW - 12);
    const below = hole.top + hole.height + 12;
    const placeBelow = below + 260 < H || hole.top < 180;
    tipStyle = placeBelow
      ? { position: 'fixed', top: below, left, width: tipW }
      : { position: 'fixed', top: Math.max(12, hole.top - 12), left, width: tipW, transform: 'translateY(-100%)' };
  }

  // Barra de progresso linear (ignora passos pulados).
  const total = STEPS.length;

  return (
    <>
      {/* Máscara escura com "buraco" no elemento alvo */}
      {hole ? (
        <>
          <div className={MASK} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onClick={close} />
          <div className={MASK} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} onClick={close} />
          <div className={MASK} style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onClick={close} />
          <div className={MASK} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} onClick={close} />
          {/* Anel animado ao redor do alvo */}
          <div
            className="pointer-events-none fixed z-50 rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] animate-pulse"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm" onClick={close} />
      )}

      {/* Balão */}
      <div className="z-[60] rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl" style={tipStyle}>
        <button onClick={close} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl">{current?.emoji}</span>
        </div>
        <h3 className="mb-1 pr-6 text-base font-bold text-slate-100">{current?.title}</h3>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">{current?.body}</p>

        {/* Indicação de clique obrigatório */}
        {requiresClick && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <MousePointerClick className="h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-300">Toca no botão destacado acima para continuar</p>
          </div>
        )}

        {/* Barra de progresso */}
        <div className="mb-3 flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= step ? 'bg-emerald-400' : 'bg-slate-700')} />
          ))}
        </div>

        {/* Navegação — só mostra "Próximo" quando não é click-to-advance */}
        {!requiresClick && (
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={prev} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={next}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              {isLast ? 'Entendi, bora! 🍀' : <>Próximo <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {isFirst && (
          <button onClick={close} className="mt-2 w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Pular tour
          </button>
        )}
      </div>
    </>
  );
}
