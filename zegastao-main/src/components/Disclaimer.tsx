import { ShieldAlert } from 'lucide-react';
import { INVESTMENT_DISCLAIMER } from '@/types';

// Aviso legal obrigatório em todas as telas de investimento.
export function Disclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{INVESTMENT_DISCLAIMER}</p>
    </div>
  );
}
