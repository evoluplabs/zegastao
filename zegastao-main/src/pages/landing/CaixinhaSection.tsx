import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CaixinhaMockupAnimated() {
  const [progress, setProgress] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(62), 400);
    const t2 = setTimeout(() => setShowDeposit(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="rounded-2xl border bg-card shadow-xl overflow-hidden max-w-sm mx-auto">
      <div className="px-5 py-4 border-b bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✈️</span>
          <div>
            <p className="text-sm font-bold">Viagem dos Sonhos</p>
            <p className="text-xs text-muted-foreground">R$ 6.200 de R$ 10.000</p>
          </div>
        </div>
        <span className="text-sm font-extrabold text-primary">62%</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Progress bar */}
        <div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
              style={{ width: `${progress}%`, transition: 'width 1.4s ease-out' }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>R$ 6.200 guardados</span>
            <span>Faltam 12 dias</span>
          </div>
        </div>

        {/* Daily target */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Poupar hoje:</p>
          <p className="text-3xl font-extrabold text-primary animate-pulse">R$ 54,80</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Calculado automaticamente com base no que falta
          </p>
        </div>

        {/* Deposit button */}
        {showDeposit && (
          <button
            onClick={() => setChecked(!checked)}
            className={`w-full rounded-xl border-2 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
              checked
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 0ms forwards' }}
          >
            <span className={`transition-transform ${checked ? 'scale-125' : ''}`}>
              {checked ? '🎉' : '✓'}
            </span>
            {checked ? 'Guardado! Incrível!' : 'Já poupei hoje!'}
          </button>
        )}

        {/* Day streak */}
        <div
          className="grid grid-cols-7 gap-1.5"
          style={{ opacity: 0, animation: 'chat-appear 0.4s ease-out 800ms forwards' }}
        >
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
            <div
              key={i}
              className={`h-7 rounded-lg text-[10px] flex items-center justify-center font-bold transition-all ${
                i < 5
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-center text-muted-foreground -mt-2">
          5 dias seguidos guardando 🔥
        </p>
      </div>
    </div>
  );
}

const BENEFITS = [
  'Meta diária calculada automaticamente',
  'Recalcula quando você perde um dia',
  'Sem planilha, sem matemática',
  'Comemore cada conquista',
];

export function CaixinhaSection() {
  return (
    <section className="py-20 md:py-28 border-b border-[#2a2d3e] bg-[#141720]">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 mb-5">
            <PiggyBank className="h-3.5 w-3.5" />
            🏛️ Cofres da Guilda — sugerido pelos aventureiros
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-100">
            Seu cofre inteligente com missão diária
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Defina um objetivo e uma data. O Zé faz as contas por você — todo dia.
          </p>
        </div>

        {/* Split layout */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="reveal-right order-1 md:order-1">
            <CaixinhaMockupAnimated />
          </div>

          <div className="reveal-left order-2 md:order-2 space-y-6">
            <p className="text-xl font-bold leading-snug text-slate-100">
              Você não precisa de força de vontade.<br />
              Você precisa do sistema certo.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Diga o quanto quer juntar e quando precisa. O Zé calcula o valor exato a depositar por dia
              — e se você pular um dia, ele recalcula tudo automaticamente, sem drama.
            </p>

            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <blockquote className="border-l-4 border-emerald-500/30 pl-4 text-sm italic text-slate-500">
              "Criei o cofre da viagem pra Disney. Depois de 3 meses depositando o valor diário,
              comprei as passagens. Nunca achei que ia conseguir."
              <span className="block mt-1 font-semibold not-italic text-slate-300">— Beta testador</span>
            </blockquote>

            <Button asChild size="lg" className="rounded-xl gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
              <Link to="/login">
                🏛️ Criar meu Cofre grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
