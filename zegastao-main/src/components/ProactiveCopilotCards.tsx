import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import type { ProactiveSuggestion } from '@/hooks/useProactiveSuggestions';

interface Props {
  suggestions: ProactiveSuggestion[];
}

const TYPE_COLORS: Record<ProactiveSuggestion['type'], string> = {
  alert: 'border-destructive/30 bg-destructive/5',
  tip: 'border-primary/20 bg-primary/5',
  win: 'border-success/30 bg-success/5',
};

export function ProactiveCopilotCards({ suggestions }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = suggestions.filter((s) => !dismissed.has(s.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <span>✨</span> Copiloto sugere
      </p>
      {visible.map((s) => (
        <div
          key={s.id}
          className={`relative rounded-xl border p-3.5 pr-9 ${TYPE_COLORS[s.type]}`}
        >
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, s.id]))}
            className="absolute top-2.5 right-2.5 rounded-full p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
            aria-label="Dispensar"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5 shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
              {s.actionLabel && s.actionUrl && (
                <button
                  onClick={() => navigate(s.actionUrl!)}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  {s.actionLabel} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
