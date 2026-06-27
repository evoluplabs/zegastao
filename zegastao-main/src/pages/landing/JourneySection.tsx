const PHASES = [
  {
    lv: 'Lv 1',
    emoji: '☠️',
    name: 'Iniciante Endividado',
    border: 'border-red-500/20 bg-red-500/5',
    badge: 'bg-red-500/15 border-red-500/30 text-red-400',
    pain: 'Gastos maiores que a renda.',
    gain: 'Parar de afundar. Respirar.',
    desc: 'O Sábio fala direto, sem enrolação: onde o dinheiro some e o que cortar primeiro. Boss mode: ativo.',
  },
  {
    lv: 'Lv 2',
    emoji: '⚔️',
    name: 'Guerreiro da Reorganização',
    border: 'border-amber-500/20 bg-amber-500/5',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    pain: 'Conta equilibrada, mas ainda há Bosses.',
    gain: 'Estratégia avalanche — atacar o Boss mais caro.',
    desc: 'O app calcula qual Boss derrotar primeiro. Você segue o plano e vê o HP deles caindo todo mês.',
  },
  {
    lv: 'Lv 3',
    emoji: '🛡️',
    name: 'Guardião Estável',
    border: 'border-sky-500/20 bg-sky-500/5',
    badge: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    pain: 'Bosses derrotados. E agora?',
    gain: 'Construir o Cofre de Emergência.',
    desc: 'Sem Bosses, o tom muda: hora de guardar ouro. Meta de 3-6 meses de gastos como reserva antes de investir.',
  },
  {
    lv: 'Lv 4',
    emoji: '🪙',
    name: 'Acumulador de Ouro',
    border: 'border-green-500/20 bg-green-500/5',
    badge: 'bg-green-500/15 border-green-500/30 text-green-400',
    pain: 'Reserva formada. Quer fazer o ouro trabalhar.',
    gain: 'Começar a investir com segurança.',
    desc: 'O app sugere onde começar (Tesouro, CDB, renda variável) de acordo com seu perfil de combate.',
  },
  {
    lv: 'Lv 5',
    emoji: '🏆',
    name: 'Mestre Investidor',
    border: 'border-amber-400/20 bg-amber-400/5',
    badge: 'bg-amber-400/15 border-amber-400/30 text-amber-300',
    pain: 'Patrimônio crescendo. Quer liberdade.',
    gain: 'Renda passiva cobrindo os gastos. FIRE desbloqueado.',
    desc: 'O Sábio acompanha o crescimento e te avisa quando a renda passiva começa a cobrir suas despesas. Final boss vencido.',
  },
];

export function JourneySection() {
  return (
    <section className="border-b border-[#3a2e1d] py-16 md:py-24 bg-[#1a130b]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">— A Jornada —</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-stone-100">
            Do vermelho à liberdade em 5 níveis.
          </h2>
          <p className="text-stone-500 max-w-xl mx-auto">
            O Zé Gastão detecta sua fase automaticamente. O tom, os conselhos e as missões mudam com você — sem julgamento.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-red-500/40 via-green-500/40 to-amber-400/40 hidden md:block" />

          <div className="space-y-4">
            {PHASES.map((p, i) => (
              <div
                key={p.lv}
                className={`reveal flex gap-4 rounded-2xl border ${p.border} p-5 md:ml-10 hover:-translate-y-0.5 transition-all duration-200`}
                data-delay={`${i * 80}`}
              >
                <div className="text-2xl shrink-0 md:hidden">{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-2xl hidden md:block">{p.emoji}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${p.badge}`}>{p.lv} · {p.name}</span>
                  </div>
                  <p className="text-xs font-semibold text-stone-500 mb-0.5">Situação: {p.pain}</p>
                  <p className="text-sm font-bold mb-1 text-stone-200">Foco: {p.gain}</p>
                  <p className="text-sm text-stone-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
