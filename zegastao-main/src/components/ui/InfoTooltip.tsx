import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow((v) => !v); }}
        onBlur={() => setShow(false)}
        className="rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label="Saiba mais"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl border bg-popover shadow-lg p-3 text-xs text-popover-foreground leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  );
}
