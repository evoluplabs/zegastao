import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ShareableCard } from './ShareableCard';
import { useReferral } from '@/hooks/useReferral';
import { Events } from '@/lib/analytics';
import type { Win } from '@/lib/wins';

// Banner discreto no Dashboard que destaca a mini-vitória mais relevante do mês
// e abre um modal com o card compartilhável (imagem). Se não há vitória, não
// renderiza nada.
export function ShareWinBanner({ wins }: { wins: Win[] }) {
  const [open, setOpen] = useState(false);
  const { referralUrl } = useReferral();
  const win = wins[0];
  if (!win) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-success/5 p-3 text-left transition-all hover:border-primary/40"
      >
        <span className="text-2xl">{win.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{win.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {win.metric} · toque para compartilhar
          </p>
        </div>
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative my-auto w-full max-w-sm rounded-2xl border bg-card p-6 shadow-md animate-slide-up">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <ShareableCard
              emoji={win.emoji}
              title={win.title}
              metric={win.metric}
              subtitle={win.subtitle}
              shareText={`${win.title} ${win.metric || ''} — com o Zé Gastão, meu copiloto financeiro.`}
              shareUrl={referralUrl || window.location.origin}
              analyticsId={Events.WIN_SHARED}
            />
          </div>
        </div>
      )}
    </>
  );
}
