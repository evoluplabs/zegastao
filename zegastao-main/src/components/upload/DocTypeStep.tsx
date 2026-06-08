import { cn } from '@/lib/utils';
import { DOC_TYPE_INFO } from '@/lib/bankGuides';
import type { StatementType } from '@/types';
import { Info } from 'lucide-react';

interface Props {
  selected: StatementType | null;
  onSelect: (type: StatementType) => void;
}

const ORDER: StatementType[] = ['checking', 'credit_card'];

export function DocTypeStep({ selected, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold">O que você quer importar?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o tipo de documento que vai enviar.
        </p>
      </div>

      <div className="grid gap-3">
        {ORDER.map((type) => {
          const info = DOC_TYPE_INFO[type];
          const active = selected === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200',
                active
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border hover:border-primary/40 hover:bg-accent/30'
              )}
            >
              <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl text-2xl shrink-0 transition-colors',
                active ? 'bg-primary/15' : 'bg-secondary'
              )}>
                {info.emoji}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{info.label}</p>
                <p className="text-xs font-medium text-primary mb-1">{info.tagline}</p>
                <p className="text-sm text-muted-foreground leading-snug">{info.whenToUse}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-snug">
          Na dúvida, comece pela <strong>Conta Corrente</strong>. Depois você pode voltar e enviar o cartão — um de cada vez.
        </p>
      </div>
    </div>
  );
}
