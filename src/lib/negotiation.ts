// Scripts de negociação (espelho estático do backend) — exibidos no frontend.
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
