import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { setProfile } from '@/lib/firestore';
import { getSpecies, getAvatar } from '@/lib/rpg/character';

interface TourStep {
  emoji: string;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

const STEPS: TourStep[] = [
  {
    emoji: '🗺️',
    title: 'Bem-vindo à sua aventura!',
    body: 'O Zé Gastão é um RPG das suas finanças reais. Você sobe de nível organizando o dinheiro, derrotando dívidas e cuidando do seu companion. Bora pro tour rápido?',
  },
  {
    emoji: '🏰',
    title: 'Painel — seu Quartel-General',
    body: 'Aqui você vê seu nível, o HP financeiro do mês e a Próxima Conquista. É a primeira tela que abre todo dia. Volte sempre para acompanhar sua evolução.',
  },
  {
    emoji: '☠️',
    title: 'Bosses — suas dívidas',
    body: 'Cada dívida é um Boss com HP. Pagar uma parcela é "atacar o Boss" e rende XP. Quitar é derrotá-lo — celebração épica garantida. O Zé te diz qual atacar primeiro.',
    cta: { label: 'Ver meus Bosses', to: '/carteira' },
  },
  {
    emoji: '⚡',
    title: 'Jornada — suas Quests',
    body: 'Missões diárias e a Quest Principal te guiam passo a passo. Cada missão concluída dá XP e te aproxima da liberdade financeira.',
    cta: { label: 'Abrir Jornada', to: '/journey' },
  },
  {
    emoji: '🎒',
    title: 'Inventário & Loja da Guilda',
    body: 'Cadastre itens que você tem em casa, gere missões de venda e anuncie na Loja da Guilda ou no WhatsApp. Transformar item parado em ouro abate seus Bosses.',
    cta: { label: 'Ver Inventário', to: '/inventario' },
  },
  {
    emoji: '🧙',
    title: 'O Sábio te acompanha',
    body: 'O Sábio (seu copiloto) conhece sua fase e suas dívidas. Pergunte qualquer coisa sobre dinheiro — ele responde sem julgamento e direto ao ponto.',
    cta: { label: 'Conversar com o Sábio', to: '/copilot' },
  },
  {
    emoji: '🎉',
    title: 'Sua jornada começa agora!',
    body: 'Cuide bem do seu companion: quanto mais saudáveis suas finanças, mais feliz ele fica. Vamos nessa, aventureiro!',
  },
];

/**
 * Tour guiado pós-onboarding, conduzido pelo companion — inspirado nos
 * tutoriais de MMORPG idle. Mobile-first: bottom sheet com avatar + balão.
 * Aparece quando onboardingDone && tourDone === false.
 */
export function GuidedTour() {
  const { profile, setProfile: setStoreProfile } = useStore();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [closing, setClosing] = useState(false);

  const shouldShow = !!profile?.onboardingDone && profile?.tourDone === false;
  if (!shouldShow || closing) return null;

  const species = getSpecies(profile?.companionSpeciesId);
  const avatar = getAvatar(profile?.avatarId);
  const companionName = profile?.companionName?.trim() || species.suggestedName;
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  async function finish() {
    setClosing(true);
    setStoreProfile({ ...profile, tourDone: true });
    await setProfile({ tourDone: true }).catch(() => {});
  }

  function next() {
    if (isLast) { finish(); return; }
    setI((v) => v + 1);
  }

  function go(to: string) {
    finish();
    navigate(to);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="w-full max-w-md rpg-panel rpg-panel-gold rounded-2xl overflow-hidden animate-sheet-up">
        {/* Cabeçalho com companion */}
        <div className="flex items-center gap-3 px-5 pt-5">
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
              <span className="text-3xl companion-idle">{species.emoji}</span>
            </div>
            <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-xs">
              {avatar.emoji}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-gold font-bold">{companionName} diz:</p>
            <p className="font-display text-base font-bold text-foreground leading-tight">{step.title}</p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4">
          <div className="flex gap-3">
            <span className="text-3xl shrink-0">{step.emoji}</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
          </div>

          {step.cta && (
            <button
              onClick={() => go(step.cta!.to)}
              className="mt-3 w-full py-2.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              {step.cta.label} →
            </button>
          )}
        </div>

        {/* Progresso + navegação */}
        <div className="flex items-center justify-between px-5 pb-5">
          <div className="flex gap-1.5">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === i ? 'w-5 bg-gold' : 'w-1.5 bg-border'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                Pular
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold glow-green"
            >
              {isLast ? '🎉 Começar!' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
