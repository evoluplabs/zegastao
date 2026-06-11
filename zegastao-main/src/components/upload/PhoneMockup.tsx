import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { BankGuideStep, BankInfo } from '@/lib/bankGuides';

interface Props {
  steps: BankGuideStep[];
  bank: BankInfo;
  activeStep: number;
  onStepChange: (i: number) => void;
}

// Mockup de celular animado em CSS. Genérico — demonstra o gesto (toque),
// enquanto o texto do passo carrega a especificidade de cada banco.
export function PhoneMockup({ steps, bank, activeStep, onStepChange }: Props) {
  const [paused, setPaused] = useState(false);

  // Auto-avança os passos em loop, a menos que o usuário tenha focado um passo.
  useEffect(() => {
    if (paused || steps.length <= 1) return;
    const timer = setInterval(() => {
      onStepChange((activeStep + 1) % steps.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [activeStep, paused, steps.length, onStepChange]);

  const step = steps[activeStep];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Moldura do celular */}
      <div
        className="relative h-[300px] w-[164px] rounded-[2rem] border-[6px] border-foreground/85 bg-background shadow-xl overflow-hidden shrink-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-16 rounded-b-xl bg-foreground/85 z-20" />

        {/* Barra do "app" com a cor do banco */}
        <div
          className="h-14 w-full flex items-end px-3 pb-2"
          style={{ backgroundColor: bank.color }}
        >
          <span className="text-white text-[11px] font-bold drop-shadow">{bank.name}</span>
        </div>

        {/* Tela interna — troca por passo */}
        <div key={activeStep} className="relative p-3 animate-in fade-in slide-in-from-right-2 duration-300">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">{step.screen}</p>

          {/* Linhas decorativas simulando itens de menu */}
          <div className="space-y-2">
            {[0, 1, 2, 3].map((row) => {
              const isTarget = row === Math.min(activeStep, 3);
              return (
                <div
                  key={row}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-2 py-2 transition-all duration-300',
                    isTarget ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-muted/60'
                  )}
                >
                  <div
                    className={cn('h-4 w-4 rounded-md shrink-0', isTarget ? 'bg-primary/40' : 'bg-muted-foreground/20')}
                  />
                  <div className="flex-1 space-y-1">
                    <div className={cn('h-1.5 rounded-full', isTarget ? 'bg-primary/50 w-3/4' : 'bg-muted-foreground/20 w-2/3')} />
                    <div className="h-1.5 rounded-full bg-muted-foreground/15 w-1/2" />
                  </div>

                  {/* Indicador de toque animado no item-alvo */}
                  {isTarget && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pontos de progresso da animação */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => { onStepChange(i); }}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === activeStep ? 'w-5 bg-primary' : 'w-1.5 bg-secondary hover:bg-primary/40'
            )}
            aria-label={`Passo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
