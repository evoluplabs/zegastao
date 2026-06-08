const COMPETITORS = [
  {
    them: 'Organizze, Mobills, Minhas Economias',
    label: 'Apps de controle',
    desc: 'Registram o que aconteceu. Você ainda precisa descobrir o que fazer.',
    icon: '📊',
  },
  {
    them: 'Planilhas do Excel / Google Sheets',
    label: 'Planilhas',
    desc: 'Funcionam se você atualizar toda semana. E se você souber o que olhar.',
    icon: '📋',
  },
  {
    them: 'Consultores financeiros',
    label: 'Consultores',
    desc: 'Caros, genéricos, e não estão disponíveis às 23h quando você quer tomar uma decisão.',
    icon: '👔',
  },
];

export function ManifestoSection() {
  return (
    <>
      {/* Manifesto */}
      <section className="border-b py-16 md:py-24 bg-foreground text-background">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-6 opacity-80">
            Por que o Zé Gastão existe
          </p>

          <blockquote className="text-2xl md:text-3xl font-bold leading-relaxed mb-8 text-balance">
            "68% dos brasileiros estão endividados. Não por falta de esforço —{' '}
            <span className="text-green-400">por falta de um plano.</span>"
          </blockquote>

          <div className="text-left space-y-4 text-base md:text-lg text-background/70 leading-relaxed max-w-2xl mx-auto">
            <p>
              Os bancos lucram com a sua confusão. Os apps de controle financeiro te mostram o problema, mas não te dão a solução. E os conselhos genéricos da internet não conhecem a sua dívida, o seu salário, a sua vida.
            </p>
            <p>
              O Zé Gastão nasceu de uma crença simples:{' '}
              <strong className="text-background">todo brasileiro merece ter um amigo que entende de finanças</strong>{' '}
              — alguém que senta com você, olha pra sua situação real, e diz: "Você consegue. Aqui está o caminho."
            </p>
            <p>
              Não é um app de controle. É um copiloto. Ele age, não só registra.
            </p>
          </div>

          <div className="mt-10 inline-flex flex-col items-center">
            <div className="text-3xl font-black text-white tracking-tight">
              "Voc<span className="text-green-400">ê</span> merece um plano.{' '}
              N<span className="text-green-400">ã</span>o uma planilha."
            </div>
            <p className="text-sm text-background/50 mt-2">— Propósito do Zé Gastão</p>
          </div>
        </div>
      </section>

      {/* Diferencial vs concorrência */}
      <section className="border-b py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Por que o Zé Gastão?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              A diferença de ter um copiloto.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Outras soluções te mostram o retrovisor. O Zé Gastão te mostra o caminho à frente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Them */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">O que existe hoje</p>
              {COMPETITORS.map((c, i) => (
                <div
                  key={i}
                  className="reveal flex gap-4 rounded-xl border border-dashed bg-secondary/30 p-4"
                  data-delay={`${i * 80}`}
                >
                  <span className="text-2xl shrink-0 opacity-50">{c.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-0.5">{c.label}</p>
                    <p className="text-sm font-semibold mb-1">{c.them}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Us */}
            <div className="reveal-right">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Zé Gastão</p>
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-5">
                {[
                  {
                    icon: '🎯',
                    title: 'Te diz o que fazer — não só o que aconteceu',
                    desc: 'Qual dívida pagar primeiro. Quanto guardar. Quando está pronto pra investir. Ação concreta, não dado bruto.',
                  },
                  {
                    icon: '🧠',
                    title: 'IA que conhece você de verdade',
                    desc: 'Não é conselho genérico. O copiloto sabe sua dívida, sua renda, sua fase — e fala com base nisso.',
                  },
                  {
                    icon: '📈',
                    title: 'Evolui com você em 5 fases',
                    desc: 'Começa como gestor de dívidas e vai se tornando seu assessor de patrimônio. Mesma conta, toda a jornada.',
                  },
                  {
                    icon: '💬',
                    title: 'Disponível 24h, sem julgamento',
                    desc: '"Posso comprar esse tênis de R$ 400?" — pergunte qualquer coisa. Ele responde com sua situação real, não com sermão.',
                  },
                ].map((d, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-xl shrink-0">{d.icon}</span>
                    <div>
                      <p className="font-bold text-sm mb-0.5">{d.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
