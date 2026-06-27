import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  getSpecies, companionStateFromHP,
} from '@/lib/rpg/character';

interface Props {
  /** HP financeiro 0–100. */
  hp: number;
  /** compact = versão pequena (header/sidebar). */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * O companion (mascote) do aventureiro. Reage ao HP financeiro: feliz quando
 * sobra dinheiro, preocupado quando aperta. É o "cuidar do bichinho" amarrado
 * à saúde financeira real do usuário.
 */
export function CompanionWidget({ hp, variant = 'full', className }: Props) {
  const profile = useStore((s) => s.profile);
  const species = getSpecies(profile?.companionSpeciesId);
  const companionName = profile?.companionName?.trim() || species.suggestedName;
  const state = companionStateFromHP(hp, companionName);

  const hpColor =
    hp >= 55 ? 'bg-primary' : hp >= 30 ? 'bg-gold' : hp >= 10 ? 'bg-amber-400' : 'bg-boss';

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
          <span className={cn('text-2xl', state.anim)}>{species.emoji}</span>
          <span className="absolute -bottom-1 -right-1 text-xs">{state.face}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{companionName}</p>
          <div className="stat-bar h-1.5 w-20 mt-0.5">
            <div className={cn('stat-bar-fill', hpColor)} style={{ width: `${hp}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rpg-panel rounded-2xl p-4', className)}>
      <div className="flex items-start gap-4">
        {/* Mascote */}
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-2xl bg-secondary border border-border flex items-center justify-center">
            <span className={cn('text-5xl', state.anim)}>{species.emoji}</span>
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center text-base">
            {state.face}
          </span>
        </div>

        {/* Estado */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display font-bold text-foreground truncate">{companionName}</p>
            <span className={cn('text-[11px] font-bold uppercase tracking-wide', state.color)}>
              {state.label}
            </span>
          </div>

          {/* HP bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">❤️ HP Financeiro</span>
              <span className={cn('font-bold', state.color)}>{hp}%</span>
            </div>
            <div className="stat-bar h-2.5">
              <div className={cn('stat-bar-fill', hpColor)} style={{ width: `${hp}%` }} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2 leading-snug">{state.line}</p>
        </div>
      </div>
    </div>
  );
}
