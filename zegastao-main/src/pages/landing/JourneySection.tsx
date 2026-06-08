const PHASES = [
  {
    n: '01',
    emoji: '🆘',
    name: 'Sobrevivência',
    color: 'border-red-300 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    pain: 'Gastos maiores que a renda.',
    gain: 'Parar de afundar. Respirar.',
    desc: 'O copiloto fala na sua língua: urgente, direto, sem enrolação. Mostra onde o dinheiro some e o que cortar primeiro.',
  },
  {
    n: '02',
    emoji: '🔄',
    name: 'Reorganização',
    color: 'border-amber-300 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    pain: 'Conta equilibrada, mas ainda há dívidas.',
    gain: 'Estratégia avalanche — atacar a mais cara.',
    desc: 'Com a conta equilibrada, o foco muda: qual dívida pagar primeiro? O app calcula e te mostra o caminho mais rápido.',
  },
  {
    n: '03',
    emoji: '🛡️',
    name: 'Estabilização',
    color: 'border-blue-300 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    pain: 'Dívidas quitadas. E agora?',
    gain: 'Construir reserva de emergência.',
    desc: 'Sem dívidas, o copiloto muda de tom: hora de guardar. Meta de 3-6 meses de gastos como colchão antes de investir.',
  },
  {
    n: '04',
    emoji: '📈',
    name: 'Acumulação',
    color: 'border-primary/30 bg-primary/5',
    badge: 'bg-primary/10 text-primary',
    pain: 'Reserva formada. Quer fazer o dinheiro trabalhar.',
    gain: 'Começar a investir com segurança.',
    desc: 'Chegou a hora. O app sugere onde começar (Tesouro, CDB, renda variável) de acordo com seu perfil de risco.',
  },
  {
    n: '05',
    emoji: '🏆',
    name: 'Crescimento',
    color: 'border-green-300 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    pain: 'Patrimônio crescendo. Quer liberdade.',
    gain: 'Renda passiva cobrindo os gastos.',
    desc: 'O copiloto acompanha o crescimento do patrimônio e te avisa quando a renda passiva começa a cobrir suas despesas.',
  },
];

export function JourneySection() {
  return (
    <section className="border-b py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">A jornada</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Do vermelho à liberdade — em 5 fases.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            O Zé Gastão detecta sua fase automaticamente. O tom, os conselhos e as tarefas mudam com você — sem julgamento.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-red-300 via-primary/50 to-green-400 hidden md:block" />

          <div className="space-y-5">
            {PHASES.map((p, i) => (
              <div
                key={p.n}
                className={`reveal flex gap-4 rounded-2xl border ${p.color} p-5 md:ml-10 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
                data-delay={`${i * 80}`}
              >
                {/* Phase circle on the line */}
                <div className="hidden md:flex absolute -left-3.5 h-7 w-7 rounded-full border-2 border-white bg-card items-center justify-center text-xs font-bold shadow-sm">
                  {p.n}
                </div>
                <div className="text-3xl shrink-0 md:hidden">{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-2xl hidden md:block">{p.emoji}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.badge}`}>{p.name}</span>
                    <span className="text-xs text-muted-foreground">Fase {p.n}</span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">Situação: {p.pain}</p>
                  <p className="text-sm font-bold mb-1">Foco: {p.gain}</p>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
