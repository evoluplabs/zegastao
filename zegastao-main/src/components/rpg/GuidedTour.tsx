import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { setProfile } from '@/lib/firestore';
import { getSpecies } from '@/lib/rpg/character';
import { SpotlightTour, type SpotlightStep } from './SpotlightTour';

// Passos do tour do Castelo — cada um ilumina um elemento real do Dashboard
// (via data-tour). Passos sem seletor são balão central (intro/encerramento).
// Os seletores condicionais (ex.: Sábio) são pulados automaticamente se ausentes.
const STEPS: SpotlightStep[] = [
  {
    emoji: '🗺️',
    title: 'Bem-vindo à sua aventura!',
    body: 'O Zé Gastão é um RPG das suas finanças reais. Vou te mostrar, em 30 segundos, onde fica cada coisa no seu Castelo.',
  },
  {
    selector: '[data-tour="character"]',
    emoji: '🛡️',
    title: 'Sua Ficha de Personagem',
    body: 'Aqui ficam seu nível, XP e profissões. Você sobe de nível organizando o dinheiro, derrotando dívidas e cumprindo missões.',
  },
  {
    selector: '[data-tour="companion"]',
    emoji: '🐲',
    title: 'Seu Companion',
    body: 'Ele reage à saúde das suas finanças: feliz quando o mês fecha no azul, preocupado quando aperta. Cuide bem dele!',
  },
  {
    selector: '[data-tour="ouro"]',
    emoji: '🏆',
    title: 'Ouro em Cofres',
    body: 'O saldo real somado das suas contas. Cadastre suas contas para acompanhar seu tesouro de verdade.',
  },
  {
    selector: '[data-tour="fluxo"]',
    emoji: '⚡',
    title: 'O Fluxo do mês',
    body: 'Ouro ganho, ouro gasto e o que sobrou. É o coração do seu mês — quanto maior o Fluxo, mais saudável seu HP financeiro.',
  },
  {
    selector: '[data-tour="acoes"]',
    emoji: '☠️',
    title: 'Ações rápidas & Bosses',
    body: 'Lance gastos, importe o extrato, ataque seus Bosses (dívidas) e abra o Inventário para vender itens e virar ouro.',
  },
  {
    selector: '[data-tour="sabio"]',
    emoji: '📜',
    title: 'O Pergaminho do Sábio',
    body: 'O Sábio observa sua jornada e deixa conselhos aqui — sem você pedir. Toque para conversar quando quiser.',
  },
  {
    emoji: '🎉',
    title: 'Sua jornada começa agora!',
    body: 'Explore o Castelo, derrote seus Bosses e suba de nível. Vamos nessa, aventureiro!',
  },
];

/**
 * Tour guiado pós-onboarding do Dashboard ("Castelo"), com spotlight real
 * apontando cada elemento — narrado pelo companion. Aparece quando
 * onboardingDone && tourDone === false. Conclui gravando tourDone no perfil.
 */
export function GuidedTour() {
  const { profile, setProfile: setStoreProfile } = useStore();
  const [closed, setClosed] = useState(false);

  const shouldShow = !!profile?.onboardingDone && profile?.tourDone === false;
  if (!shouldShow || closed) return null;

  const species = getSpecies(profile?.companionSpeciesId);
  const companionName = profile?.companionName?.trim() || species.suggestedName;

  function finish() {
    setClosed(true);
    setStoreProfile({ ...profile, tourDone: true });
    setProfile({ tourDone: true }).catch(() => {});
  }

  return (
    <SpotlightTour
      steps={STEPS}
      onClose={finish}
      accent="gold"
      narrator={{ emoji: species.emoji, name: companionName }}
      finishLabel="🎉 Começar!"
    />
  );
}
