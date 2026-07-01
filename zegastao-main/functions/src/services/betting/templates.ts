// Biblioteca de templates — a "voz do Zé". Toda explicação do sistema sai daqui,
// de forma determinística (sem IA). Os NÚMEROS vêm do motor; aqui só viram texto
// em português de quebrada, honesto e consistente. Testável por unidade.

import { RoundPlan } from './engine/multiples';

export const MARKET_LABELS: Record<string, string> = {
  h2h: 'Resultado (1X2)',
  totals: 'Total de Gols',
  btts: 'Ambas Marcam',
  spreads: 'Handicap',
  corners: 'Escanteios',
  cards: 'Cartões',
  shots: 'Finalizações',
  fouls: 'Faltas',
};

export function marketLabel(key: string): string {
  return MARKET_LABELS[key] || key;
}

export function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

// ---- Passo a passo de execução (card guiado) ----

export function legSteps(homeTeam: string, awayTeam: string, market: string, selection: string, minOdd: number): string[] {
  return [
    'Abra o app ou site da Betano',
    `Busque o jogo ${homeTeam} x ${awayTeam}`,
    `Vá no mercado "${marketLabel(market)}"`,
    `Escolha "${selection}" — só vale se a odd estiver em ${minOdd.toFixed(2)} ou mais`,
  ];
}

export function multipleSteps(legCount: number): string[] {
  return [
    'Abra o app ou site da Betano',
    'Adicione cada seleção abaixo ao seu bilhete',
    `Confirme que as ${legCount} seleções estão no boletim de múltipla`,
    'Confira a odd total e coloque o valor sugerido',
  ];
}

// ---- "Por que essa aposta?" (sublegenda transparente) ----

export function roundReasoning(plan: RoundPlan): string {
  switch (plan.reasonCode) {
    case 'value_single':
      return `Achei valor nessa: nossa conta dá mais chance do que a odd está pagando. Aposta simples, do jeito mais seguro de jogar.`;
    case 'value_multiple':
      return `Juntei ${plan.legs.length} seleções que, cada uma, tem valor de verdade. Múltipla de pernas boas — a chance combinada ainda joga a seu favor.`;
    case 'moonshot':
      return `Essa é a fézinha de sorte 🎲. Pra chegar no alvo que você pediu, juntei ${plan.legs.length} jogos. Paga alto, mas a chance é baixa — joga só com o que não vai fazer falta.`;
    case 'moonshot_capped':
      return `Montei a maior múltipla que deu com os jogos do dia (${plan.legs.length} pernas). Não cheguei no alvo cheio, mas é o teto seguro de pernas. Quanto mais jogo, mais difícil.`;
    case 'sgm':
      return plan.usedBetanoOdd
        ? `Múltipla no mesmo jogo (${plan.legs.length} seleções). Usei a odd final que a própria Betano te deu no print — essa é a verdade do mercado. Lembra: quanto mais coisa no mesmo jogo, mais a casa embute margem.`
        : `Múltipla no mesmo jogo (${plan.legs.length} seleções). Como as seleções são do mesmo jogo, elas "andam juntas" — ajustei a conta pra baixo (correlação) pra não te enganar com chance inflada. Quanto mais coisa no mesmo jogo, mais a casa lucra.`;
    case 'best_available':
      return `Não encontrei valor claro aqui — o EV está negativo, ou seja, a casa tem vantagem matemática nessa seleção. Mas aqui está a melhor opção disponível para você decidir com os números na mesa.`;
    case 'no_candidates':
    default:
      return `Hoje não achei nada que valha a pena de verdade. Melhor guardar a grana — não existe aposta boa todo dia, e isso é parte de jogar com cabeça.`;
  }
}

// ---- Selo de entendimento (nível 2, obrigatório antes de liberar) ----

export function understandingSeal(combinedProb: number, potentialReturn: number, stake: number): string {
  const chance = combinedProb < 0.01 ? 'menos de 1%' : pct(combinedProb);
  return [
    `Essa é uma fézinha de sorte 🎲.`,
    `Chance real de dar certo: ~${chance}.`,
    `Se der, paga ${fmtBRL(potentialReturn)} em cima dos seus ${fmtBRL(stake)}.`,
    `Mas é tipo bilhete de rifa: em muitas tentativas dessas, o normal é sair no prejuízo. A casa lucra mais justamente com múltiplas grandes.`,
    `Topa mesmo assim?`,
  ].join(' ');
}

// ---- Recálculo dinâmico ao informar a odd real da Betano ----

export type RecalcStatus = 'green' | 'up' | 'down' | 'lost';

export function recalcMessage(status: RecalcStatus, params: {
  oldStake?: number;
  newStake?: number;
  minOdd?: number;
}): string {
  switch (status) {
    case 'green':
      return `Tá valendo! ✅ Pode apostar ${fmtBRL(params.newStake ?? 0)} com tranquilidade.`;
    case 'up':
      return `A odd subiu — ficou ainda melhor! 🔼 Dá pra apostar um pouco mais: de ${fmtBRL(params.oldStake ?? 0)} pra ${fmtBRL(params.newStake ?? 0)}, com a mesma margem de segurança.`;
    case 'down':
      return `A margem apertou. Ainda compensa, mas baixei o valor de ${fmtBRL(params.oldStake ?? 0)} pra ${fmtBRL(params.newStake ?? 0)} pra se proteger.`;
    case 'lost':
      return `A essa odd não vale mais a pena. 👉 Te mostro uma opção melhor logo abaixo, ou é melhor pular esse jogo.`;
  }
}

// ---- Progresso do ciclo ----

export function cycleProgress(currentBankroll: number, budget: number, targetPct: number): string {
  const target = budget * (1 + targetPct / 100);
  const growthNow = budget > 0 ? ((currentBankroll - budget) / budget) * 100 : 0;
  if (currentBankroll >= target) {
    return `🎯 Meta batida! Saiu de ${fmtBRL(budget)} e chegou em ${fmtBRL(currentBankroll)}. Ciclo fechado no azul — bora sacar e comemorar com cabeça.`;
  }
  if (growthNow >= 0) {
    return `Banca em ${fmtBRL(currentBankroll)} (${growthNow >= 0 ? '+' : ''}${Math.round(growthNow)}%). Faltam ${fmtBRL(Math.max(0, target - currentBankroll))} pra meta. Seguindo o ciclo.`;
  }
  return `Banca em ${fmtBRL(currentBankroll)} (${Math.round(growthNow)}%). Faz parte — o ciclo é de vários jogos. Mantém a disciplina e não corre atrás do prejuízo.`;
}

// ---- Cross-over com o Zé Gastão (trava da fatura) ----
// Quando a fase financeira pede cautela, o Zé limita o valor da aposta e explica.
export function crossOverNote(phase: string, cappedStake: number, originalStake: number): string {
  if (cappedStake >= originalStake) return '';
  const motivo =
    phase === 'stabilizing'
      ? 'você ainda tá montando sua reserva de emergência'
      : phase === 'accumulating'
      ? 'você tá começando a investir e é hora de proteger esse progresso'
      : 'seu momento financeiro pede um pouco mais de cautela';
  return `Dei uma passada no balcão do Zé Gastão 🧮: como ${motivo}, segurei a aposta em ${fmtBRL(cappedStake)} (em vez de ${fmtBRL(originalStake)}). Fézinha é com o que sobra, nunca com o que faz falta.`;
}

// ---- Trava de dopamina (saque após ganhar) ----
export function dopamineLockMessage(wonAmount: number): string {
  return [
    `🎉 Ciclo fechado no azul: ${fmtBRL(wonAmount)}!`,
    `Antes de começar outro, faz o saque desse lucro e me manda o print do "Saque solicitado".`,
    `É a parte chata que separa quem ganha de quem devolve tudo pra casa. Dinheiro na conta > número na tela.`,
  ].join(' ');
}

export function withdrawalConfirmed(): string {
  return `Saque confirmado! 💚 Esse é o gosto de ganhar de verdade. Quando quiser, a gente abre um novo ciclo com a cabeça fria.`;
}

// ---- Ouvidoria do Fumo (perda, push empático e honesto) ----
export function ouvidoriaDoFumo(homeTeam?: string, awayTeam?: string): string {
  const jogo = homeTeam && awayTeam ? `${homeTeam} x ${awayTeam}` : 'o jogo';
  return [
    `Pô, ${jogo} não saiu como a conta apontava. 😮‍💨`,
    `A matemática estava do nosso lado — o futebol é que foi cruel dessa vez.`,
    `Isso acontece com todo mundo da nossa turma que joga com cabeça. Faz parte do ciclo. Bora pra próxima com disciplina, sem correr atrás do prejuízo.`,
  ].join(' ');
}

// ---- Card de compartilhamento (member-to-member) ----

export function shareWinText(homeTeam: string, awayTeam: string, profit: number, referralCode?: string): string {
  const base = `Green com o Zé Apostador! 🟢 ${homeTeam} x ${awayTeam} me pagou ${fmtBRL(profit)}. Aposta com cabeça, fézinha consciente.`;
  return referralCode ? `${base}\n\nEntra com meu convite: ze.gastao/r/${referralCode}` : base;
}
