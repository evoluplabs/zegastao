// Guias de exportação de extrato por banco × tipo de documento.
// Texto curto, imperativo, sem jargão. Usado pelo wizard de upload.

import type { StatementType } from '@/types';

export interface BankGuideStep {
  title: string;       // ação principal do passo
  detail: string;      // detalhe/onde encontrar
  screen: string;      // rótulo da "tela" mostrada no mockup
}

export interface BankGuide {
  steps: BankGuideStep[];
  format: string;      // formatos recomendados
  whichMonth: string;  // orientação de período
}

export interface BankInfo {
  key: string;
  name: string;
  color: string;       // cor de marca (para o avatar)
  initial: string;     // letra/sigla exibida
}

// Bancos suportados (espelha functions/src/services/parsers/bank-detector.ts)
export const SUPPORTED_BANKS: BankInfo[] = [
  { key: 'nubank', name: 'Nubank', color: '#820AD1', initial: 'Nu' },
  { key: 'inter', name: 'Inter', color: '#FF7A00', initial: 'In' },
  { key: 'itau', name: 'Itaú', color: '#EC7000', initial: 'It' },
  { key: 'bradesco', name: 'Bradesco', color: '#CC092F', initial: 'Br' },
  { key: 'santander', name: 'Santander', color: '#EC0000', initial: 'Sa' },
  { key: 'c6', name: 'C6 Bank', color: '#242424', initial: 'C6' },
  { key: 'bb', name: 'Banco do Brasil', color: '#FAE128', initial: 'BB' },
  { key: 'caixa', name: 'Caixa', color: '#0070AF', initial: 'Cx' },
  { key: 'picpay', name: 'PicPay', color: '#11C76F', initial: 'Pp' },
  { key: 'generico', name: 'Outro banco', color: '#64748B', initial: '?' },
];

export function getBankInfo(key: string): BankInfo {
  return SUPPORTED_BANKS.find((b) => b.key === key) || SUPPORTED_BANKS[SUPPORTED_BANKS.length - 1];
}

const MONTH_CHECKING = 'Envie o mês fechado mais recente. Para uma análise melhor, repita para os 3 últimos meses — um arquivo por vez.';
const MONTH_CARD = 'Envie a fatura fechada mais recente. Se quiser histórico, repita para as últimas faturas.';

// Guia genérico (fallback para "Outro banco" e bancos sem guia detalhado)
const GENERIC_CHECKING: BankGuide = {
  steps: [
    { title: 'Abra o app ou internet banking', detail: 'Entre na sua conta corrente.', screen: 'Início' },
    { title: 'Procure por "Extrato"', detail: 'Costuma ficar no menu principal ou em "Conta".', screen: 'Menu' },
    { title: 'Escolha o período', detail: 'Selecione o mês que deseja importar.', screen: 'Extrato' },
    { title: 'Exporte / compartilhe', detail: 'Toque em exportar e escolha PDF ou CSV.', screen: 'Exportar' },
  ],
  format: 'PDF ou CSV (prefira CSV quando houver)',
  whichMonth: MONTH_CHECKING,
};

const GENERIC_CARD: BankGuide = {
  steps: [
    { title: 'Abra o app do banco', detail: 'Vá até a área do seu cartão de crédito.', screen: 'Início' },
    { title: 'Abra "Faturas"', detail: 'Procure por faturas ou histórico de faturas.', screen: 'Cartão' },
    { title: 'Escolha a fatura', detail: 'Selecione a fatura fechada que deseja importar.', screen: 'Faturas' },
    { title: 'Exporte / compartilhe', detail: 'Baixe em PDF ou CSV.', screen: 'Exportar' },
  ],
  format: 'PDF ou CSV (prefira CSV quando houver)',
  whichMonth: MONTH_CARD,
};

// Guias detalhados por banco
const GUIDES: Record<string, Partial<Record<StatementType, BankGuide>>> = {
  nubank: {
    checking: {
      steps: [
        { title: 'Abra o app do Nubank', detail: 'Faça login com sua senha.', screen: 'Início' },
        { title: 'Toque em "Conta"', detail: 'No topo da tela, sobre o saldo da NuConta.', screen: 'NuConta' },
        { title: 'Toque em "Histórico"', detail: 'Role e procure o ícone de extrato/histórico.', screen: 'Conta' },
        { title: 'Toque no ícone de compartilhar', detail: 'No canto superior. Escolha "Exportar extrato".', screen: 'Histórico' },
        { title: 'Escolha o período e exporte', detail: 'Selecione o mês e baixe em CSV ou PDF.', screen: 'Exportar' },
      ],
      format: 'CSV (recomendado) ou PDF',
      whichMonth: MONTH_CHECKING,
    },
    credit_card: {
      steps: [
        { title: 'Abra o app do Nubank', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Cartão de crédito"', detail: 'Na tela inicial.', screen: 'Início' },
        { title: 'Toque em "Faturas"', detail: 'Veja a lista de faturas.', screen: 'Cartão' },
        { title: 'Abra a fatura fechada', detail: 'Toque na fatura desejada.', screen: 'Faturas' },
        { title: 'Toque em "Compartilhar"', detail: 'Baixe a fatura em PDF ou CSV.', screen: 'Fatura' },
      ],
      format: 'CSV (recomendado) ou PDF',
      whichMonth: MONTH_CARD,
    },
  },
  inter: {
    checking: {
      steps: [
        { title: 'Abra o app do Inter', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Extrato"', detail: 'No menu inferior ou em "Conta".', screen: 'Menu' },
        { title: 'Filtre o período', detail: 'Escolha o mês que deseja.', screen: 'Extrato' },
        { title: 'Toque em "Exportar"', detail: 'Ícone no canto superior. Escolha PDF ou Excel.', screen: 'Exportar' },
      ],
      format: 'PDF ou Excel (XLSX)',
      whichMonth: MONTH_CHECKING,
    },
    credit_card: {
      steps: [
        { title: 'Abra o app do Inter', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Cartões"', detail: 'Selecione seu cartão de crédito.', screen: 'Cartões' },
        { title: 'Abra "Faturas"', detail: 'Escolha a fatura fechada.', screen: 'Cartão' },
        { title: 'Toque em "Compartilhar fatura"', detail: 'Baixe em PDF.', screen: 'Fatura' },
      ],
      format: 'PDF',
      whichMonth: MONTH_CARD,
    },
  },
  itau: {
    checking: {
      steps: [
        { title: 'Abra o app do Itaú', detail: 'Faça login com sua senha.', screen: 'Início' },
        { title: 'Toque em "Extrato"', detail: 'No menu principal.', screen: 'Menu' },
        { title: 'Selecione o período', detail: 'Escolha os dias ou o mês.', screen: 'Extrato' },
        { title: 'Toque em "Compartilhar/Salvar"', detail: 'Exporte em PDF ou TXT/OFX.', screen: 'Exportar' },
      ],
      format: 'PDF ou TXT',
      whichMonth: MONTH_CHECKING,
    },
    credit_card: {
      steps: [
        { title: 'Abra o app do Itaú', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Cartões"', detail: 'Selecione o cartão de crédito.', screen: 'Cartões' },
        { title: 'Abra a fatura', detail: 'Escolha a fatura fechada.', screen: 'Faturas' },
        { title: 'Toque em "Salvar/Compartilhar"', detail: 'Baixe em PDF.', screen: 'Fatura' },
      ],
      format: 'PDF',
      whichMonth: MONTH_CARD,
    },
  },
  c6: {
    checking: {
      steps: [
        { title: 'Abra o app do C6 Bank', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Extrato"', detail: 'Na área da conta.', screen: 'Conta' },
        { title: 'Escolha o período', detail: 'Selecione o mês.', screen: 'Extrato' },
        { title: 'Toque em "Exportar"', detail: 'Baixe em PDF ou CSV.', screen: 'Exportar' },
      ],
      format: 'CSV ou PDF',
      whichMonth: MONTH_CHECKING,
    },
    credit_card: {
      steps: [
        { title: 'Abra o app do C6 Bank', detail: 'Faça login.', screen: 'Início' },
        { title: 'Toque em "Cartão"', detail: 'Vá ao seu cartão de crédito.', screen: 'Cartão' },
        { title: 'Abra "Faturas"', detail: 'Escolha a fatura fechada.', screen: 'Faturas' },
        { title: 'Toque em "Compartilhar"', detail: 'Baixe em PDF.', screen: 'Fatura' },
      ],
      format: 'PDF',
      whichMonth: MONTH_CARD,
    },
  },
};

export function getBankGuide(bankKey: string, type: StatementType): BankGuide {
  const bankGuides = GUIDES[bankKey];
  const specific = bankGuides?.[type];
  if (specific) return specific;
  return type === 'credit_card' ? GENERIC_CARD : GENERIC_CHECKING;
}

export const DOC_TYPE_INFO: Record<StatementType, { label: string; tagline: string; whenToUse: string; emoji: string }> = {
  checking: {
    label: 'Conta Corrente',
    tagline: 'Extrato da conta',
    whenToUse: 'Mostra tudo que entra e sai da sua conta. Comece por aqui — só com isso o Zé já monta sua visão financeira.',
    emoji: '🏦',
  },
  credit_card: {
    label: 'Cartão de Crédito',
    tagline: 'Fatura do cartão',
    whenToUse: 'Mostra suas compras no cartão. Use para entender para onde o limite vai embora.',
    emoji: '💳',
  },
};
