import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CASES = [
  {
    avatar: '⚔️',
    name: 'João, 34 anos · São Paulo',
    phase: 'Lv 1 → Lv 2 · Guerreiro',
    phaseColor: 'bg-red-500/15 border-red-500/30 text-red-400',
    story: 'João tinha R$ 23.000 espalhados em cartão, cheque especial e empréstimo. Não sabia nem o total — tinha medo de somar. Em 3 min de onboarding, o Zé montou o mapa de Bosses e o plano: quitação em 22 meses na ordem certa.',
    result: 'R$ 4.800 economizados em juros',
    resultIcon: '💰',
    resultColor: 'border-green-500/30 bg-green-500/10 text-green-400',
  },
  {
    avatar: '🛡️',
    name: 'Maria, 29 anos · Belo Horizonte',
    phase: 'Lv 2 → Lv 3 · Guardiã',
    phaseColor: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    story: 'Maria tinha a conta equilibrada mas dois financiamentos ativos. O Sábio mostrou que pagar R$ 80 a mais no Boss de maior taxa economizaria R$ 1.240 e cortaria 7 meses da quitação. Ela nunca tinha pensado nessa conta.',
    result: '7 meses mais rápido que o previsto',
    resultIcon: '⚡',
    resultColor: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  },
  {
    avatar: '🪙',
    name: 'Carlos, 41 anos · Porto Alegre',
    phase: 'Lv 3 → Lv 4 · Acumulador',
    phaseColor: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    story: 'Carlos quitou os últimos Bosses e o app mudou automaticamente: parou de mostrar alertas de dívida e começou a sugerir onde guardar ouro. Em 11 semanas, formou uma reserva de 4 meses. Agora está nos primeiros investimentos.',
    result: 'Cofre de 4 meses em 11 semanas',
    resultIcon: '🏆',
    resultColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
];

export function CasesSection() {
  const [idx, setIdx] = useState(0);
  const c = CASES[idx];

  return (
    <section className="border-b border-[#3a2e1d] py-16 md:py-24 bg-[#15110b]">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">— Batalhas Vencidas —</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-stone-100">
            Eles já estavam no seu lugar.
          </h2>
          <p className="text-sm text-stone-500">
            Personas compostas · Situações reais vividas por aventureiros
          </p>
        </div>

        <div className="reveal-scale">
          <div className="rounded-2xl border border-[#3a2e1d] bg-[#211a11] p-8 shadow-xl shadow-black/30">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar */}
              <div className="shrink-0 text-center md:text-left">
                <div className="text-6xl mb-3">{c.avatar}</div>
                <p className="font-bold text-sm text-stone-200">{c.name}</p>
                <span className={`inline-flex mt-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${c.phaseColor}`}>
                  {c.phase}
                </span>
              </div>

              {/* Story */}
              <div className="flex-1">
                <p className="text-stone-400 leading-relaxed mb-6 text-sm md:text-base">
                  "{c.story}"
                </p>
                <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 ${c.resultColor}`}>
                  <span className="text-xl">{c.resultIcon}</span>
                  <span className="font-bold text-sm">{c.result}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setIdx((idx - 1 + CASES.length) % CASES.length)}
              className="h-9 w-9 rounded-full border border-[#3a2e1d] bg-[#211a11] flex items-center justify-center hover:bg-[#2b2115] transition-colors text-stone-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {CASES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? 'bg-green-400 w-6' : 'bg-stone-700 w-2'}`}
                />
              ))}
            </div>
            <button
              onClick={() => setIdx((idx + 1) % CASES.length)}
              className="h-9 w-9 rounded-full border border-[#3a2e1d] bg-[#211a11] flex items-center justify-center hover:bg-[#2b2115] transition-colors text-stone-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
