import { cn } from '@/lib/utils';
import { SUPPORTED_BANKS } from '@/lib/bankGuides';
import { Check } from 'lucide-react';

interface Props {
  selected: string | null;
  onSelect: (bankKey: string) => void;
}

export function BankPicker({ selected, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">Qual é o seu banco?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Vamos te mostrar como exportar nesse banco.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {SUPPORTED_BANKS.map((bank) => {
          const active = selected === bank.key;
          return (
            <button
              key={bank.key}
              onClick={() => onSelect(bank.key)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200',
                active
                  ? 'border-primary bg-primary/5 scale-[0.97]'
                  : 'border-border hover:border-primary/40 hover:bg-accent/30'
              )}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: bank.color }}
              >
                {bank.initial}
              </span>
              <span className="text-xs font-medium text-center leading-tight">{bank.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
