import { cn } from '@/lib/utils';
import { XP_EVENTS } from '@/lib/xp';
import type { DailyTask } from '@/types';

interface QuestCardProps {
  task: DailyTask;
  onComplete?: () => void;
  completed?: boolean;
  className?: string;
}

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Fácil',   color: 'emerald', xp: XP_EVENTS.task_easy,   icon: '🌿', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Médio',   color: 'amber',   xp: XP_EVENTS.task_medium, icon: '⚔️', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  hard:   { label: 'Difícil', color: 'red',     xp: XP_EVENTS.task_hard,   icon: '🔥', badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const CATEGORY_ICONS: Record<string, string> = {
  renda_extra:  '💰',
  economia:     '🛡️',
  aprendizado:  '📚',
  investimento: '📈',
};

export function QuestCard({ task, onComplete, completed = false, className }: QuestCardProps) {
  const diff = DIFFICULTY_CONFIG[task.difficulty] ?? DIFFICULTY_CONFIG.medium;

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-all duration-200',
      completed
        ? 'border-emerald-500/30 bg-emerald-950/20 opacity-60'
        : 'border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
          {CATEGORY_ICONS[task.category] ?? '📋'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border',
              diff.badgeClass
            )}>
              {diff.icon} {diff.label}
            </span>
            {task.estimatedTime && (
              <span className="text-[10px] text-muted-foreground">⏱ {task.estimatedTime}</span>
            )}
          </div>
          <h3 className={cn(
            'text-sm font-semibold mt-1 leading-snug',
            completed ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>
            {task.title}
          </h3>
          {task.estimatedReturn && (
            <p className="text-xs text-emerald-400 font-medium mt-0.5">
              💰 Recompensa: {task.estimatedReturn}
            </p>
          )}
        </div>

        {/* XP badge */}
        <div className="shrink-0 text-right">
          <span className="text-xs font-bold text-amber-400">+{diff.xp} XP</span>
        </div>
      </div>

      {task.platform && (
        <p className="text-[11px] text-muted-foreground pl-12">via {task.platform}</p>
      )}

      {onComplete && !completed && (
        <button
          onClick={onComplete}
          className="w-full rounded-lg py-2 px-4 bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all text-primary text-sm font-semibold border border-primary/20"
        >
          ✅ Missão Concluída
        </button>
      )}

      {completed && (
        <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium pl-12">
          <span>✅</span>
          <span>Missão concluída · +{diff.xp} XP ganhos</span>
        </div>
      )}
    </div>
  );
}
