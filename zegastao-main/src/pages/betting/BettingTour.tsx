import { useState, useEffect } from 'react';
import { X, ChevronRight, HelpCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_KEY = 'ze_apostador_tour_v1';

interface Step {
  emoji: string;
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Olá! Vou te guiar pelo Zé',
    body: 'São 8 passos rápidos para você dominar todas as ferramentas. Pode pular a qualquer hora e voltar pelo botão "?" no canto da tela.',
    tip: 'Tempo médio: 2 minutos',
  },
  {
    emoji: '🎯',
    title: 'Mandato: sua banca e sua meta',
    body: 'Você já configurou seu mandato — ele define quanto você tem para apostar em cada ciclo, sua meta de crescimento e o stop-loss. Tudo baseado no seu perfil financeiro no Zé Gastão.',
    tip: 'Você pode ajustar o mandato conversando com o Copiloto.',
  },
  {
    emoji: '🔄',
    title: 'Iniciar um ciclo',
    body: 'Um ciclo é uma "sessão" de apostas com começo, meio e fim. Escolha o estilo (Seguro ou Moonshot) e clique em "Iniciar ciclo". O Zé para automaticamente quando você bater a meta ou o stop-loss.',
    tip: 'Moonshot usa odds mais altas, mais risco. Seguro prioriza valor esperado positivo.',
  },
  {
    emoji: '🔍',
    title: 'Buscar aposta pro ciclo',
    body: 'Clique em "Buscar aposta pro ciclo". O Zé consulta estatísticas de gols, escanteios, cartões e chutes via API, pesquisa na internet (lesões, árbitro, peso do jogo) e monta a aposta com o melhor EV dentro da sua banca.',
    tip: 'O processo leva ~15 segundos. São vários agentes trabalhando em paralelo.',
  },
  {
    emoji: '🃏',
    title: 'Card guiado: confira antes de apostar',
    body: 'O card guiado aparece com cada perna da aposta, a odd recomendada e a stake (calculada pelo Kelly criterion). Você pode digitar a odd atual da Betano e recalcular. Nada é automático — você confirma antes de apostar.',
    tip: 'Se a odd caiu, o Zé recalcula a stake para preservar o seu EV.',
  },
  {
    emoji: '✅',
    title: 'Registrar o resultado',
    body: 'Depois do jogo, volte ao card e clique "Ganhei" ou "Perdi". Isso alimenta o aprendizado: o Zé calibra os modelos com seus resultados reais ao longo do tempo.',
    tip: 'Quanto mais feedback você der, mais preciso o Zé fica para o seu perfil.',
  },
  {
    emoji: '📸',
    title: 'Ler print da Betano',
    body: 'Clique em "Ler print da Betano" e mande uma foto da tela da Betano (qualquer mercado). O Zé extrai as odds com OCR grátis — Claude Vision só entra se o OCR falhar. Se outro usuário já extraiu o mesmo jogo, você recebe o aviso na hora.',
    tip: 'Isso é o "Waze das Odds": odds compartilhadas entre a comunidade.',
  },
  {
    emoji: '🕵️',
    title: 'Desmascarar guru',
    body: 'Recebeu dica de tipster? Clique em "Desmascarar guru" e mande o print do bilhete. O Zé calcula a probabilidade real de cada perna e mostra quanto a casa embutiu de margem naquela dica.',
    tip: 'Guias com odds longas geralmente escondem margens acima de 15%.',
  },
  {
    emoji: '💚',
    title: 'Jogo responsável: pausar',
    body: 'Sentiu que está apostando demais? Clique em "Pausar" no canto superior direito. Uma auto-exclusão de 7 dias é ativada — nenhuma aposta pode ser montada ou confirmada nesse período. O Zé cuida de você.',
    tip: 'O botão "Pausar" fica sempre visível nesta página.',
  },
];

interface Props {
  autoStart?: boolean;
}

export function BettingTour({ autoStart = true }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (autoStart && !localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  function close() {
    localStorage.setItem(TOUR_KEY, '1');
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setStep(0);
    setOpen(true);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      {/* Floating help trigger */}
      {!open && (
        <button
          onClick={restart}
          title="Abrir guia do Zé Apostador"
          className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-900 text-emerald-400 shadow-lg transition-colors hover:bg-slate-800"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      {/* Overlay + bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Sheet */}
          <div className="relative rounded-t-3xl border border-slate-700 border-b-0 bg-slate-900 p-5 pb-10 shadow-2xl">
            {/* Close */}
            <button
              onClick={close}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Progress dots */}
            <div className="mb-5 flex items-center justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step
                      ? 'w-6 bg-emerald-400'
                      : i < step
                        ? 'w-1.5 bg-emerald-700'
                        : 'w-1.5 bg-slate-700',
                  )}
                />
              ))}
            </div>

            {/* Content */}
            <div className="mb-4 space-y-2 text-center">
              <div className="text-4xl">{current.emoji}</div>
              <h3 className="text-lg font-bold text-slate-100">{current.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{current.body}</p>
            </div>

            {/* Tip */}
            {current.tip && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-medium text-emerald-300">
                  💡 {current.tip}
                </p>
              </div>
            )}

            {/* Step counter */}
            <p className="mb-3 text-center text-xs text-slate-600">
              Passo {step + 1} de {STEPS.length}
            </p>

            {/* Nav buttons */}
            <div className="flex gap-2">
              {!isFirst && (
                <Button
                  variant="ghost"
                  className="shrink-0 text-slate-400 hover:text-slate-200"
                  onClick={prev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button
                className={cn(
                  'flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400',
                  isFirst && 'w-full',
                )}
                onClick={next}
              >
                {isLast ? (
                  'Pronto, tô por dentro! 🎯'
                ) : (
                  <span className="flex items-center gap-1">
                    Próximo <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>

            {isFirst && (
              <button
                onClick={close}
                className="mt-3 w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Pular tour
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
