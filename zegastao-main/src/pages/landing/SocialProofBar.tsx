import { useEffect, useRef, useState } from 'react';

const BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'BB', 'Caixa', 'Inter', 'C6 Bank', 'Sicoob'];

const STATS = [
  { value: 2000, suffix: '+', label: 'usuários ativos' },
  { value: 9, suffix: '', label: 'bancos suportados' },
  { value: 18, suffix: ' meses', label: 'tempo médio de quitação com o plano Copiloto' },
  { value: 0, suffix: ' reais', label: 'para criar sua conta' },
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
    <section className="border-y bg-secondary/30">
      {/* Banks */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-center text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Compatível com os principais bancos brasileiros
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {BANKS.map((bank) => (
            <span
              key={bank}
              className="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {bank}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="border-t mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center reveal" data-delay="100">
              <p className="text-3xl font-extrabold text-primary">
                <CountUp target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
