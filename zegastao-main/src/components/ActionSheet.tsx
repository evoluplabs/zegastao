import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ActionSheetItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
  title?: string;
}

export function ActionSheet({ open, onClose, items, title }: ActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-card rounded-t-3xl shadow-2xl border-t animate-sheet-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {title && (
          <p className="text-center text-sm font-semibold text-muted-foreground pb-2">{title}</p>
        )}

        <div className="px-4 pt-2 pb-4 space-y-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose(); }}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors active:scale-[0.98]',
                item.variant === 'destructive'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'hover:bg-accent'
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg">
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base leading-tight">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
              <svg className="h-4 w-4 text-muted-foreground/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full rounded-2xl border py-3.5 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
