import { useEffect, useRef, useState } from 'react';

const BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'BB', 'Caixa', 'Inter', 'C6 Bank', 'Sicoob'];

const STATS = [
  { value: 2000, suffix: '+', label: 'aventureiros ativos', emoji: '⚔️' },
  { value: 9, suffix: '', label: 'arenas (bancos) suportadas', emoji: '🏛️' },
  { value: 18, suffix: ' meses', label: 'tempo médio pra quitar com o Aventureiro', emoji: '🏆' },
  { value: 0, suffix: ' reais', label: 'pra criar seu personagem', emoji: '🎮' },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1200;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setDisplay(target);
            clearInterval(timer);
          } else {
            setDisplay(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const formatted = target >= 1000 ? display.toLocaleString('pt-BR') : display;
  return <span ref={ref}>{formatted}{suffix}</span>;
}

export function SocialProofBar() {
  return (
    <section className="border-y border-[#2a2d3e] bg-[#141720]">
      {/* Banks */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-center text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-wider">
          — Arenas compatíveis —
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {BANKS.map((bank) => (
            <span
              key={bank}
              className="rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-200 hover:border-emerald-500/30 transition-colors"
            >
              {bank}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-[#2a2d3e] mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center reveal" data-delay="100">
              <p className="text-sm mb-1">{s.emoji}</p>
              <p className="text-3xl font-extrabold text-emerald-400">
                <CountUp target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
