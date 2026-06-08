const PAINS = [
  {
    emoji: '😩',
    title: 'Pago o mínimo do cartão todo mês...',
    desc: '...e a dívida não para de crescer. Parece que nunca vai acabar. É porque não vai — no mínimo, os juros sempre ganham.',
    highlight: 'Os juros ganham no mínimo.',
  },
  {
    emoji: '📊',
    title: 'Já tentei 3 planilhas diferentes.',
    desc: 'Sempre começo cheio de gás e desisto no segundo mês. A planilha não me avisa quando estou errando — ela só registra o estrago.',
    highlight: 'Planilha não te avisa. Copiloto avisa.',
  },
  {
    emoji: '😶',
    title: 'Não sei ao certo quanto devo no total.',
    desc: 'Tenho medo de somar tudo e ver o número real. É mais fácil não olhar. Mas o que você não vê, continua crescendo.',
    highlight: 'O que você não vê, cresce.',
  },
];

export function ProblemSection() {
  return (
    <section className="border-b py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Você se identifica?</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Se sim, o Zé Gastão foi feito pra você.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A maioria dos brasileiros não tem problema de renda — tem problema de informação e de plano.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              className="reveal group relative rounded-2xl border bg-card p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default"
              data-delay={`${i * 100}`}
            >
              <div className="text-4xl mb-4">{p.emoji}</div>
              <h3 className="font-bold text-base mb-2 leading-snug">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
              <div className="rounded-lg bg-primary/8 border border-primary/15 px-3 py-2">
                <p className="text-xs font-semibold text-primary">{p.highlight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
