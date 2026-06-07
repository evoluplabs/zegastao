// Guia de negociação: scripts estáticos + detecção de oportunidades.
// Usado pelo job noturno (alertas) e exposto ao frontend (banco estático espelhado).

export interface NegotiationScript {
  id: string;
  title: string;
  trigger: string;
  script: string;
  tip: string;
}

export const NEGOTIATION_SCRIPTS: Record<string, NegotiationScript> = {
  credit_card_high_rate: {
    id: 'credit_card_high_rate',
    title: 'Cartão com juros altos',
    trigger: 'Cartão com taxa > 10% a.m.',
    script: `"Bom dia, gostaria de falar com o setor de retenção.
Estou com dificuldade de pagar a fatura devido aos juros elevados.
Tenho propostas de outros bancos com taxas menores e preferiria resolver aqui.
Qual a menor taxa que vocês conseguem para renegociar meu saldo atual?"`,
    tip: 'Mencione que está considerando cancelar o cartão. O setor de retenção tem metas e pode oferecer taxas bem menores. Registre nome do atendente e protocolo.',
  },
  personal_loan_early_payoff: {
    id: 'personal_loan_early_payoff',
    title: 'Quitação antecipada de empréstimo',
    trigger: 'Empréstimo com taxa > 3% a.m.',
    script: `"Quero saber o valor para quitação antecipada do contrato [número].
Por lei (Resolução CMN 4.292/2013), tenho direito a desconto proporcional
dos juros futuros na quitação antecipada.
Qual o valor exato para quitar hoje / em 30 dias / em 60 dias?"`,
    tip: 'Compare com a projeção do app. Se o banco não aplicar o desconto correto, registre reclamação no Banco Central (bcb.gov.br/registrarreclamacao).',
  },
  overdue_debt: {
    id: 'overdue_debt',
    title: 'Dívida em atraso',
    trigger: 'Dívida em atraso > 90 dias',
    script: `"Quero regularizar minha situação. Qual o valor mínimo para acordo?
Tenho condições de pagar [X% do valor] à vista ou [Y%] em até 3 parcelas.
Existe alguma campanha de renegociação ativa?"`,
    tip: 'Dívidas em atraso longo têm margem de desconto de 40-70%. Nunca aceite a primeira oferta. Peça 48h para "consultar" e volte com proposta menor.',
  },
};

export interface NegotiationAlert {
  debtId: string;
  creditor: string;
  message: string;
  action: string;
  scriptId: string;
}

interface DebtLike {
  id?: string;
  creditor?: string;
  interestRateMonthly?: number;
  overdueMonths?: number;
  remainingInstallments?: number;
  totalBalance?: number;
  monthlyPayment?: number;
}

// Detecta oportunidades de negociação para uma lista de dívidas.
export function detectNegotiationAlerts(debts: DebtLike[]): NegotiationAlert[] {
  const alerts: NegotiationAlert[] = [];
  for (const d of debts) {
    const creditor = d.creditor || 'credor';
    const rate = d.interestRateMonthly || 0;

    if (rate > 0.08) {
      alerts.push({
        debtId: d.id || '',
        creditor,
        message: `Sua dívida com ${creditor} tem taxa de ${(rate * 100).toFixed(1)}% a.m. — entre as mais altas do mercado. É possível renegociar.`,
        action: 'Ver script de negociação',
        scriptId: rate > 0.1 ? 'credit_card_high_rate' : 'personal_loan_early_payoff',
      });
    }

    if ((d.overdueMonths || 0) >= 3) {
      alerts.push({
        debtId: d.id || '',
        creditor,
        message: `Dívida com ${creditor} em atraso há ${d.overdueMonths} meses — desconto de até 60% possível na renegociação.`,
        action: 'Ver como negociar',
        scriptId: 'overdue_debt',
      });
    }

    if ((d.remainingInstallments || 0) > 0 && (d.remainingInstallments || 0) <= 6) {
      alerts.push({
        debtId: d.id || '',
        creditor,
        message: `Faltam apenas ${d.remainingInstallments} parcelas para quitar ${creditor}. Solicitar quitação antecipada pode economizar em juros.`,
        action: 'Calcular economia',
        scriptId: 'personal_loan_early_payoff',
      });
    }
  }
  return alerts;
}
