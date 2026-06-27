const FEATURES = [
  { tier: 'T1', emoji: '📊', title: 'Reconhecimento de Itens', desc: 'Importe seu extrato e a IA categoriza tudo automaticamente — sem digitar nada.' },
  { tier: 'T1', emoji: '⏰', title: 'Alerta de Boss Chegando', desc: 'Aviso 3 dias antes de cada fatura vencer. Nunca mais leve dano por esquecimento.' },
  { tier: 'T1', emoji: '🔍', title: 'Scanner de Contratos', desc: 'Fotografe qualquer contrato de crédito. A IA extrai taxa, CET e onde negociar.' },
  { tier: 'T1', emoji: '💳', title: 'Detector de Armadilha', desc: 'Descubra quanto você paga a mais pagando só o mínimo do cartão. Dano oculto revelado.' },
  { tier: 'T2', emoji: '📋', title: 'Missão: Imposto de Renda', desc: 'O Zé encontra deduções no seu extrato, monta checklist e gera relatório completo.' },
  { tier: 'T2', emoji: '🔥', title: 'Simulador FIRE', desc: 'Veja em quantos anos você atinge independência financeira e quanto poupar pra acelerar.' },
  { tier: 'T2', emoji: '👫', title: 'Modo Party / Casal', desc: 'Compartilhe as finanças com parceiro(a). Cada um mantém conta própria — visão unificada.' },
  { tier: 'T2', emoji: '📦', title: 'Rastreador de Parcelas', desc: 'O app detecta parcelas no extrato e agrupa automaticamente — mostrando quanto falta pagar.' },
  { tier: 'T2', emoji: '📬', title: 'Relatório Semanal', desc: 'Toda segunda-feira: quanto gastou, situação geral e um empurrãozinho pra próxima missão.' },
  { tier: 'T3', emoji: '🧙', title: 'Sábio Financeiro (NPC)', desc: 'Quando o app detecta padrão perigoso, ele avisa antes do problema — não depois do dano.' },
  { tier: 'T3', emoji: '📜', title: 'Diário do Aventureiro', desc: 'Resumo do mês em PDF — saldo, categorias, metas — para baixar ou compartilhar.' },
  { tier: 'T3', emoji: '💬', title: 'Chat com Contexto Real', desc: 'Pergunte "devo quitar ou investir?" — o Sábio conhece suas dívidas e responde com seus números.' },
  { tier: 'T3', emoji: '⚔️', title: 'Raid: Zé Apostador · Copa 2026', desc: 'Fotografa o jogo na Betano. A IA lê as odds, calcula a chance real e monta a aposta com valor.' },
  { tier: 'T3', emoji: '🔎', title: 'Desmascarador de Guru', desc: 'Manda o print do bilhete do tipster. O Zé mostra a probabilidade real e o quanto a casa lucra.' },
];

const TIER_STYLE: Record<string, string> = {
  T1: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  T2: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
  T3: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
};

export function FeaturesSection() {
  return (
    <section className="border-b border-[#2a2d3e] py-16 md:py-24 bg-[#0f1117]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
            — Arsenal de Habilidades —
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100">
            Tudo que o Zé faz por você
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            Do controle de dívidas ao Imposto de Renda — sem planilha, sem contador caro. O RPG de finanças mais honesto do Brasil.
          </p>
        </div>

        {/* Tier legend */}
        <div className="flex justify-center gap-4 mb-8">
          {(['T1', 'T2', 'T3'] as const).map((t) => (
            <div key={t} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${TIER_STYLE[t]}`}>
              {t} {t === 'T1' ? '· Base' : t === 'T2' ? '· Avançado' : '· Elite'}
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="reveal group relative rounded-2xl border border-[#2a2d3e] bg-[#1a1d27] p-5 space-y-2 hover:border-emerald-500/30 hover:bg-[#1e2235] transition-all duration-200"
              data-delay={`${(i % 6) * 60}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl">{f.emoji}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TIER_STYLE[f.tier]}`}>{f.tier}</span>
              </div>
              <p className="font-bold text-sm text-slate-100">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
