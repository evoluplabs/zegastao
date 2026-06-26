// Nova seção "Tudo que o Zé faz por você" — entre DemoSection e JourneySection.
const FEATURES = [
  {
    emoji: '📊',
    title: 'Categorização automática',
    desc: 'Importe seu extrato (PDF ou CSV) e a IA categoriza tudo em segundos — sem digitar nada.',
  },
  {
    emoji: '📆',
    title: 'Alertas de vencimento',
    desc: 'Aviso 3 dias antes de cada parcela vencer. Nunca mais pague multa por esquecer.',
  },
  {
    emoji: '📋',
    title: 'Assistente de IR',
    desc: 'O Zé encontra deduções no seu extrato, monta o checklist e gera relatório para o Imposto de Renda.',
  },
  {
    emoji: '🔥',
    title: 'Simulador FIRE',
    desc: 'Veja em quantos anos você atinge a liberdade financeira e quanto poupar por mês para acelerar.',
  },
  {
    emoji: '💳',
    title: 'Custo do mínimo',
    desc: 'Descubra quanto você paga a mais por pagar só o mínimo do cartão — e quanto economizaria.',
  },
  {
    emoji: '📸',
    title: 'Contratos pela câmera',
    desc: 'Fotografe qualquer contrato de crédito. A IA extrai taxa, CET, multas e onde negociar.',
  },
  {
    emoji: '👫',
    title: 'Modo casal/família',
    desc: 'Compartilhe as finanças com seu parceiro(a). Cada um mantém sua conta — visão unificada.',
  },
  {
    emoji: '🛒',
    title: 'Parcelamento inteligente',
    desc: 'O app detecta automaticamente parcelas no extrato e agrupa — mostrando quanto falta pagar.',
  },
  {
    emoji: '📬',
    title: 'Resumo semanal',
    desc: 'Toda segunda-feira: quanto gastou na semana, situação geral e um empurrãozinho.',
  },
  {
    emoji: '🤖',
    title: 'Copiloto proativo',
    desc: 'Quando o app detecta um padrão perigoso, ele avisa antes do problema — não depois.',
  },
  {
    emoji: '📈',
    title: 'Relatório PDF mensal',
    desc: 'Resumo bonito do mês — saldo, categorias, metas — para baixar ou compartilhar.',
  },
  {
    emoji: '💬',
    title: 'Chat com contexto real',
    desc: 'Pergunte "devo quitar ou investir?" — a IA conhece suas dívidas e responde com seus números.',
  },
  {
    emoji: '⚽',
    title: 'Zé Apostador · Copa 2026',
    desc: 'Fotografa o jogo na Betano. A IA lê as odds, calcula a chance real e monta a aposta com mais valor. Sem achismo.',
  },
  {
    emoji: '🔍',
    title: 'Desmascarador de Guru',
    desc: 'Manda o print do bilhete do tipster. O Zé mostra a probabilidade real e quanto a casa está ganhando de você.',
  },
];

export function FeaturesSection() {
  return (
    <section className="border-b py-16 md:py-24 bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Tudo em um só lugar
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Tudo que o Zé faz por você
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Do controle de dívidas ao Imposto de Renda — sem precisar de planilha, contador ou suporte financeiro caro.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="reveal rounded-2xl border bg-card p-5 space-y-2 hover:shadow-md transition-shadow"
              data-delay={`${(i % 6) * 60}`}
            >
              <span className="text-3xl">{f.emoji}</span>
              <p className="font-bold text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
