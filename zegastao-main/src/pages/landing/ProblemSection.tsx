const PAINS = [
  {
    emoji: '☠️',
    tier: 'Boss Lv 5',
    title: 'O Boss de Juros te drena HP todo mês',
    desc: 'Você paga o mínimo do cartão — e a dívida só cresce. No mínimo, os juros sempre vencem. É uma mecânica armada contra você.',
    highlight: '⚔️ O Zé mostra o ATK real do Boss.',
    cls: 'border-red-500/20 bg-red-500/5',
    hlCls: 'bg-red-500/10 border-red-500/20 text-red-400',
  },
  {
    emoji: '📋',
    tier: 'Missão Falha ×3',
    title: 'Tentou planilhas. Todas falharam.',
    desc: 'Começa cheio de gás, abandona no 2º mês. Planilha não te avisa quando você está errando — ela só registra o estrago depois.',
    highlight: '🧙 O Sábio te avisa antes do dano.',
    cls: 'border-amber-500/20 bg-amber-500/5',
    hlCls: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  {
    emoji: '🌑',
    tier: 'Boss Desconhecido',
    title: 'Não sabe quanto deve no total',
    desc: 'Medo de somar e ver o número real. É mais fácil não olhar. Mas Boss que você não vê... continua crescendo no escuro.',
    highlight: '🗺️ Mapa de Boss: conheça todos os inimigos.',
    cls: 'border-slate-700/60 bg-slate-800/30',
    hlCls: 'bg-slate-700/30 border-slate-600/30 text-slate-400',
  },
];

export function ProblemSection() {
  return (
    <section className="border-b border-[#2a2d3e] py-16 md:py-24 bg-[#0f1117]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">— Você se identifica? —</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-100">
            Qual é o seu Boss financeiro?
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            A maioria dos brasileiros não tem problema de renda — tem problema de informação e de plano de ataque.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              className={`reveal group relative rounded-2xl border p-6 hover:-translate-y-1 transition-all duration-300 cursor-default ${p.cls}`}
              data-delay={`${i * 100}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{p.emoji}</span>
                <span className="rounded-full border border-slate-600/40 bg-slate-700/30 px-2 py-0.5 text-[10px] font-bold text-slate-400">{p.tier}</span>
              </div>
              <h3 className="font-bold text-base mb-2 leading-snug text-slate-100">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{p.desc}</p>
              <div className={`rounded-lg border px-3 py-2 ${p.hlCls}`}>
                <p className="text-xs font-semibold">{p.highlight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
