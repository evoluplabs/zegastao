// Formata respostas em linguagem RPG para WhatsApp — zero custo de IA aqui.
import type { UserContext } from './actions';
import type { IntentType } from './intent';

const CATEGORY_EMOJI: Record<string, string> = {
  Alimentação: '🍕', Transporte: '🚗', Moradia: '🏠', Saúde: '💊',
  Lazer: '🎮', Educação: '📚', Vestuário: '👕', Serviços: '⚡', Outros: '💰',
};

function xpBar(xp: number, level: number, len = 8): string {
  const xpForLvl = (n: number) => Math.round(100 * n * (n - 1) / 2);
  const current = xp - xpForLvl(level);
  const needed = xpForLvl(level + 1) - xpForLvl(level);
  const filled = Math.max(0, Math.min(len, Math.round((current / needed) * len)));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function hpBar(pct: number, len = 8): string {
  const filled = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
}

const APP_URL = 'https://zegastao.com.br';

export function formatExpenseRegistered(ctx: UserContext): string {
  const r = ctx.registered!;
  const emoji = CATEGORY_EMOJI[r.category] ?? '💰';
  const { xp, level, dailyStreak } = ctx.profile;
  const xpLine = `+${ctx.xpEarned} XP · Lv ${level} ${xpBar(xp, level)}`;
  const streakLine = dailyStreak > 1 ? `🔥 Streak: ${dailyStreak} dias!` : '';

  let bossLine = '';
  if (ctx.topDebt) {
    const d = ctx.topDebt;
    bossLine = `\n☠️ Boss ${d.creditor}: HP ${d.hpPercent}% ${hpBar(d.hpPercent)}`;
  }

  return [
    `⚔️ *Gasto registrado!*`,
    `${emoji} ${r.description} · ${formatBRL(r.amount)}`,
    bossLine,
    ``,
    xpLine,
    streakLine,
  ].filter(Boolean).join('\n');
}

export function formatIncomeRegistered(ctx: UserContext): string {
  const r = ctx.registered!;
  const { xp, level, dailyStreak } = ctx.profile;
  const xpLine = `+${ctx.xpEarned} XP · Lv ${level} ${xpBar(xp, level)}`;
  const streakLine = dailyStreak > 1 ? `🔥 Streak: ${dailyStreak} dias!` : '';

  return [
    `💰 *Renda registrada!*`,
    `🪙 ${r.description} · ${formatBRL(r.amount)} na bolsa de ouro!`,
    ``,
    xpLine,
    streakLine,
  ].filter(Boolean).join('\n');
}

export function formatDebtPaymentRegistered(ctx: UserContext): string {
  const r = ctx.registered!;
  const { xp, level } = ctx.profile;
  const xpLine = `+${ctx.xpEarned} XP · Lv ${level} ${xpBar(xp, level)}`;

  let bossLine = '';
  if (ctx.topDebt) {
    const d = ctx.topDebt;
    bossLine = `\n☠️ Boss ${d.creditor}: HP ${d.hpPercent}% ${hpBar(d.hpPercent)}\n💸 ${formatBRL(d.totalBalance)} restante · ${(d.interestRateMonthly * 100).toFixed(1)}%/mês`;
  }

  return [
    `💥 *Golpe no Boss!*`,
    `⚔️ ${r.description ?? 'Pagamento'} · ${formatBRL(r.amount)}`,
    bossLine,
    ``,
    xpLine,
  ].filter(Boolean).join('\n');
}

export function formatBalanceQuery(ctx: UserContext): string {
  const balance = ctx.monthlyBalance ?? 0;
  const sign = balance >= 0 ? '+' : '';
  const emoji = balance >= 0 ? '✅' : '❌';

  let bossLine = '';
  if (ctx.topDebt) {
    const d = ctx.topDebt;
    bossLine = `\n☠️ Boss ${d.creditor}: ${formatBRL(d.totalBalance)} · ${(d.interestRateMonthly * 100).toFixed(1)}%/mês`;
  }

  return [
    `📊 *Situação do mês*`,
    `${emoji} Resultado: ${sign}${formatBRL(balance)}`,
    bossLine,
    ``,
    `🔥 Streak: ${ctx.profile.dailyStreak} dias · Lv ${ctx.profile.level}`,
    `_Ver detalhes completos: ${APP_URL}_`,
  ].filter(Boolean).join('\n');
}

export function formatBossQuery(ctx: UserContext): string {
  if (!ctx.topDebt) {
    return `🏆 *Sem bosses ativos!*\n\nVocê está livre de dívidas — ou ainda não registrou nenhuma.\n\n_Registre suas dívidas no app: ${APP_URL}_`;
  }
  const d = ctx.topDebt;
  const lvlEmoji = d.interestRateMonthly > 0.15 ? '💀' : d.interestRateMonthly > 0.05 ? '☠️' : '👹';
  return [
    `${lvlEmoji} *Boss em Foco*`,
    `🎯 ${d.creditor}`,
    `❤️ HP: ${d.hpPercent}% ${hpBar(d.hpPercent)}`,
    `💰 Saldo: ${formatBRL(d.totalBalance)}`,
    `⚡ Juros: ${(d.interestRateMonthly * 100).toFixed(1)}%/mês`,
    ``,
    `Registre um pagamento para causar dano:\n_"paguei parcela do ${d.creditor}"_`,
  ].join('\n');
}

export function formatSummary(ctx: UserContext): string {
  const { xp, level, dailyStreak } = ctx.profile;
  const balance = ctx.monthlyBalance ?? 0;
  const sign = balance >= 0 ? '+' : '';
  const hpPct = balance >= 0 ? Math.min(100, Math.round((balance / 500) * 100)) : 0;

  let bossLine = '';
  if (ctx.topDebt) {
    const d = ctx.topDebt;
    bossLine = `☠️ Boss: ${d.creditor} · HP ${d.hpPercent}% · ${formatBRL(d.totalBalance)}`;
  }

  return [
    `📜 *Relatório de Batalha*`,
    ``,
    `🗡️ Nível ${level} · ${xp.toLocaleString('pt-BR')} XP`,
    `❤️ HP Financeiro: ${hpPct}% ${hpBar(hpPct)}`,
    `💰 Mês: ${sign}${formatBRL(balance)}`,
    bossLine,
    `🔥 Streak: ${dailyStreak} dias`,
    ``,
    `_Painel completo: ${APP_URL}_`,
  ].filter(Boolean).join('\n');
}

export function formatDocumentStored(): string {
  return [
    `📁 *Documento guardado!*`,
    ``,
    `Seu arquivo foi salvo com segurança na sua Guilda de Documentos.`,
    `Acesse-os a qualquer momento no app.`,
    ``,
    `_${APP_URL}_`,
  ].join('\n');
}

export function formatAudioReceived(): string {
  return [
    `🎙️ *Áudio recebido!*`,
    ``,
    `Por enquanto, me mande por texto:`,
    `• _"gastei R$50 no mercado"_`,
    `• _"recebi R$800 de freela"_`,
    `• _"paguei parcela do Nubank"_`,
    ``,
    `Transcrição de áudio chega em breve! 🚀`,
  ].join('\n');
}

export function formatGreeting(linked: boolean): string {
  if (!linked) {
    return [
      `👋 *Oi! Sou o Zé Gastão, seu parceiro de batalha financeira.*`,
      ``,
      `Para registrar gastos por aqui, vincule seu WhatsApp no app:`,
      `🔗 ${APP_URL}/profile`,
      ``,
      `Ou crie sua conta grátis e comece sua jornada:`,
      `⚔️ ${APP_URL}`,
    ].join('\n');
  }
  return [
    `⚔️ *Zé Gastão pronto para batalha!*`,
    ``,
    `Comandos disponíveis:`,
    `• _"gastei X em Y"_ → registrar gasto`,
    `• _"recebi X de Y"_ → registrar renda`,
    `• _"paguei parcela de Y"_ → atacar boss`,
    `• _"saldo"_ → situação do mês`,
    `• _"boss"_ → maior dívida`,
    `• _"resumo"_ → relatório de batalha`,
    `• Foto de nota fiscal → registrar automaticamente`,
    `• Documento → guardar na Guilda`,
  ].join('\n');
}

export function formatUnknown(): string {
  return [
    `🤔 Não entendi bem...`,
    ``,
    `Tente assim:`,
    `• _"gastei 50 no mercado"_`,
    `• _"recebi 300 de freela"_`,
    `• _"saldo"_ · _"boss"_ · _"resumo"_`,
    ``,
    `Ou acesse o app para tudo mais: ${APP_URL}`,
  ].join('\n');
}

export function formatByIntent(intentType: IntentType, ctx: UserContext, linked: boolean): string {
  switch (intentType) {
    case 'register_expense':    return formatExpenseRegistered(ctx);
    case 'register_income':     return formatIncomeRegistered(ctx);
    case 'register_debt_payment': return formatDebtPaymentRegistered(ctx);
    case 'query_balance':       return formatBalanceQuery(ctx);
    case 'query_boss':          return formatBossQuery(ctx);
    case 'query_summary':       return formatSummary(ctx);
    case 'store_document':      return formatDocumentStored();
    case 'greeting':            return formatGreeting(linked);
    default:                    return formatUnknown();
  }
}
