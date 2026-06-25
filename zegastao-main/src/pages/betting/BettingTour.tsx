import { useState, useEffect, useLayoutEffect, useCallback, useRef, type CSSProperties } from 'react';
import { X, ChevronRight, HelpCircle, ChevronLeft, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_KEY = 'ze_apostador_tour_v2';

interface TourStep {
  // Quando tem selector, o passo "ilumina" o elemento real na tela.
  // Sem selector, é um cartão central (boas-vindas / fim).
  selector?: string;
  emoji: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    emoji: '👋',
    title: 'Bora dar um tour rápido?',
    body: 'Em 30 segundos eu te mostro, passo a passo, onde clicar pra fazer sua primeira aposta com o Zé. Pode ir clicando em "Próximo".',
  },
  {
    selector: '[data-tour="banca"]',
    emoji: '💰',
    title: 'Aqui fica o seu dinheiro',
    body: 'Esse é o valor que você tem pra apostar agora. A barra mostra o quanto falta pra bater a sua meta. Quando bater, o Zé avisa pra você sacar.',
  },
  {
    selector: '[data-tour="build"]',
    emoji: '👇',
    title: 'É AQUI que tudo começa',
    body: 'Clique neste botão. O Zé vai olhar os jogos do dia, estudar cada um e te mostrar uma aposta pronta. Você NÃO precisa enviar print nem fazer mais nada — é só clicar aqui.',
  },
  {
    selector: '[data-tour="start"]',
    emoji: '🚀',
    title: 'Comece um ciclo primeiro',
    body: 'Antes de apostar, clique aqui pra abrir um "ciclo" — é a sua rodada de apostas. Depois é só pedir pro Zé achar um jogo bom.',
  },
  {
    selector: '[data-tour="card"]',
    emoji: '🎟️',
    title: 'A aposta que o Zé montou',
    body: 'Aqui está a sugestão, com os jogos e quanto apostar. Confira tudo, abra a Betano, faça a aposta lá e depois é só marcar aqui se ganhou ou perdeu. Nada é feito automático — você manda.',
  },
  {
    selector: '[data-tour="tools"]',
    emoji: '📸',
    title: 'Isto aqui é opcional',
    body: 'Se quiser, mande uma foto da tela da Betano pra eu conferir as odds, ou cole o palpite de um "guru" pra ver se vale a pena. Mas pode ignorar — não é preciso pra apostar.',
  },
  {
    selector: '[data-tour="pause"]',
    emoji: '💚',
    title: 'Sempre no controle',
    body: 'Sentiu que apostou demais? Toque em "Pausar" aqui em cima e o Zé tranca tudo por 7 dias. Sua diversão tem que caber no bolso.',
  },
  {
    emoji: '✅',
    title: 'Tá pronto!',
    body: 'Se bater alguma dúvida depois, toque no botão "?" no canto da tela pra rever este tour quando quiser. Boa sorte!',
  },
];

const PAD = 8;

interface Rect { top: number; left: number; width: number; height: number; }

interface Props {
  autoStart?: boolean;
}

export function BettingTour({ autoStart = true }: Props) {
  const [open, setOpen] = useState(false);
  const [rawStep, setRawStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Pula passos cujo alvo não está na tela (ex.: "Iniciar ciclo" some quando já
  // existe ciclo). Assim o tour se adapta ao que o usuário está vendo.
  const resolveStep = useCallback((from: number, dir: 1 | -1): number => {
    let i = from;
    while (i >= 0 && i < STEPS.length) {
      const s = STEPS[i];
      if (!s.selector || document.querySelector(s.selector)) return i;
      i += dir;
    }
    return -1;
  }, []);

  const step = rawStep;
  const current = STEPS[step];

  useEffect(() => {
    if (autoStart && !localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => {
        const first = resolveStep(0, 1);
        if (first >= 0) { setRawStep(first); setOpen(true); }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [autoStart, resolveStep]);

  // Mede o elemento alvo (e remede em scroll/resize/layout).
  useLayoutEffect(() => {
    if (!open || !current) return;
    if (!current.selector) { setRect(null); return; }

    function measure() {
      const el = current.selector ? document.querySelector(current.selector) : null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    // Rola até o alvo uma vez; depois só remede a posição.
    const target = current.selector ? document.querySelector(current.selector) : null;
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    measure();
    const id = window.setInterval(measure, 200);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, current]);

  function close() {
    localStorage.setItem(TOUR_KEY, '1');
    setOpen(false);
  }
  function next() {
    const n = resolveStep(step + 1, 1);
    if (n >= 0) setRawStep(n); else close();
  }
  function prev() {
    const p = resolveStep(step - 1, -1);
    if (p >= 0) setRawStep(p);
  }
  function restart() {
    const first = resolveStep(0, 1);
    setRawStep(first >= 0 ? first : 0);
    setOpen(true);
  }

  // Botão flutuante pra reabrir o tour.
  if (!open) {
    return (
      <button
        onClick={restart}
        title="Rever o tour do Zé"
        className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-900 text-emerald-400 shadow-lg transition-colors hover:bg-slate-800"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  const isLast = resolveStep(step + 1, 1) < 0;
  const isFirst = resolveStep(step - 1, -1) < 0;

  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  const mask = 'fixed bg-slate-950/80 z-50';
  const W = typeof window !== 'undefined' ? window.innerWidth : 0;
  const H = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Posição do balão: abaixo do alvo se couber, senão acima. Sem alvo = centro.
  let tipStyle: CSSProperties;
  if (!hole) {
    tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    const below = hole.top + hole.height + 14;
    const tipW = Math.min(340, W - 24);
    const left = Math.min(Math.max(12, hole.left + hole.width / 2 - tipW / 2), W - tipW - 12);
    const placeBelow = below + 220 < H || hole.top < 200;
    tipStyle = placeBelow
      ? { top: below, left, width: tipW }
      : { top: Math.max(12, hole.top - 14), left, width: tipW, transform: 'translateY(-100%)' };
  }

  return (
    <>
      {/* Máscara escura com "buraco" no alvo (4 retângulos ao redor) */}
      {hole ? (
        <>
          <div className={mask} style={{ top: 0, left: 0, width: W, height: Math.max(0, hole.top) }} onClick={close} />
          <div className={mask} style={{ top: hole.top + hole.height, left: 0, width: W, height: Math.max(0, H - (hole.top + hole.height)) }} onClick={close} />
          <div className={mask} style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onClick={close} />
          <div className={mask} style={{ top: hole.top, left: hole.left + hole.width, width: Math.max(0, W - (hole.left + hole.width)), height: hole.height }} onClick={close} />
          {/* Anel destacando o alvo */}
          <div
            className="pointer-events-none fixed z-50 rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-50 bg-slate-950/80" onClick={close} />
      )}

      {/* Balão */}
      <div
        ref={tipRef}
        className="fixed z-[60] rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        style={tipStyle}
      >
        <button onClick={close} className="absolute right-3 top-3 text-slate-500 transition-colors hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">{current.emoji}</span>
          {current.selector && <Hand className="h-4 w-4 animate-pulse text-emerald-400" />}
        </div>
        <h3 className="mb-1 pr-6 text-base font-bold text-slate-100">{current.title}</h3>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">{current.body}</p>

        {/* Progresso */}
        <div className="mb-3 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= step ? 'bg-emerald-400' : 'bg-slate-700')} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button onClick={prev} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar
            </button>
          )}
          <button
            onClick={next}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
          >
            {isLast ? 'Entendi, bora!' : <>Próximo <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>

        {isFirst && (
          <button onClick={close} className="mt-2 w-full text-center text-xs text-slate-600 transition-colors hover:text-slate-400">
            Pular tour
          </button>
        )}
      </div>
    </>
  );
}
