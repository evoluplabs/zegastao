import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpotlightTour, type SpotlightStep } from '@/components/rpg/SpotlightTour';

const TOUR_KEY = 'ze_apostador_tour_v2';

const STEPS: SpotlightStep[] = [
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

interface Props {
  autoStart?: boolean;
  /** Número de apostas já concluídas (outcome !== 'pending'). Em 1, encerra o tour. */
  betsCompleted?: number;
}

export function BettingTour({ autoStart = true, betsCompleted = 0 }: Props) {
  const [open, setOpen] = useState(false);

  // Conclui a primeira aposta → encerra o tour permanentemente.
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
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, [autoStart, betsCompleted]);

  function close() {
    localStorage.setItem(TOUR_KEY, 'done');
    setOpen(false);
  }

  function restart() {
    if (betsCompleted > 0) return; // já apostou — tour só via "?"
    setOpen(true);
  }

  if (!open) {
    return (
      <button
        onClick={restart}
        title="Rever o tour do Zé"
        className={cn(
          'fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-colors',
          betsCompleted > 0
            ? 'border-border bg-card text-muted-foreground/70 hover:text-foreground/80'
            : 'border-green-500/40 bg-card text-green-400 hover:bg-secondary',
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  return <SpotlightTour steps={STEPS} onClose={close} accent="green" finishLabel="Entendi, bora! 🍀" />;
}
