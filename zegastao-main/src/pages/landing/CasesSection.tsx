import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CASES = [
  {
    avatar: '👨‍💼',
    name: 'João, 34 anos · São Paulo',
    phase: 'Sobrevivência → Reorganização',
    phaseColor: 'text-red-600 bg-red-50',
    story:
      'João tinha R$ 23.000 espalhados em cartão de crédito, cheque especial e um empréstimo pessoal. Não sabia nem o total exato — tinha medo de somar. Em 3 minutos de onboarding, o Zé Gastão montou o plano: quitação em 22 meses pagando R$ 1.050/mês na ordem certa.',
    result: 'R$ 4.800 economizados em juros',
    resultIcon: '💰',
  },
  {
    avatar: '👩‍🏫',
    name: 'Maria, 29 anos · Belo Horizonte',
    phase: 'Reorganização → Estabilização',
    phaseColor: 'text-amber-600 bg-amber-50',
    story:
      'Maria tinha a conta equilibrada mas dois financiamentos ativos. O Copiloto mostrou que pagar R$ 80 a mais por mês na dívida de maior taxa economizaria R$ 1.240 e cortaria 7 meses da quitação. Ela nunca tinha pensado nessa conta.',
    result: '7 meses mais rápido que o previsto',
    resultIcon: '⚡',
  },
  {
    avatar: '👨‍🔧',
    name: 'Carlos, 41 anos · Porto Alegre',
    phase: 'Estabilização → Acumulação',
    phaseColor: 'text-blue-600 bg-blue-50',
    story:
      'Carlos quitou as últimas dívidas e o app mudou automaticamente: parou de mostrar alertas de dívida e começou a sugerir onde guardar. Em 11 semanas, formou uma reserva de 4 meses. Agora está nos primeiros investimentos — Tesouro Selic.',
    result: 'Reserva de 4 meses em 11 semanas',
    resultIcon: '🛡️',
  },
];

export function CasesSection() {
  const [idx, setIdx] = useState(0);
  const c = CASES[idx];

  return (
    <section className="border-b py-16 md:py-24 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-12 reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Histórias reais</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Eles já estavam no seu lugar.
          </h2>
          <p className="text-sm text-muted-foreground">
            Personas compostas · Situações reais vividas por usuários
          </p>
        </div>

        <div className="reveal-scale">
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar + info */}
              <div className="shrink-0 text-center md:text-left">
                <div className="text-6xl mb-3">{c.avatar}</div>
                <p className="font-bold text-sm">{c.name}</p>
                <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.phaseColor}`}>
                  {c.phase}
                </span>
              </div>

              {/* Story */}
              <div className="flex-1">
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm md:text-base">
                  "{c.story}"
                </p>
                <div className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
                  <span className="text-xl">{c.resultIcon}</span>
                  <span className="font-bold text-green-700 text-sm">{c.result}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setIdx((idx - 1 + CASES.length) % CASES.length)}
              className="h-9 w-9 rounded-full border bg-card flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {CASES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? 'bg-primary w-6' : 'bg-border w-2'}`}
                />
              ))}
            </div>
            <button
              onClick={() => setIdx((idx + 1) % CASES.length)}
              className="h-9 w-9 rounded-full border bg-card flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
