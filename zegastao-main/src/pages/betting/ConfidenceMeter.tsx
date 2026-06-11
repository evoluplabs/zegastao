import { cn } from '@/lib/utils';

interface Props {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-500';
}

function getLabel(score: number): string {
  if (score >= 75) return 'Alta confiança';
  if (score >= 60) return 'Confiança moderada';
  if (score >= 45) return 'Confiança baixa';
  return 'Análise inconclusiva';
}

function getBg(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ConfidenceMeter({ score, size = 'md' }: Props) {
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className={cn('space-y-1', size === 'sm' && 'space-y-0.5')}>
      <div className="flex items-center justify-between">
        <span className={cn('font-semibold', getColor(clampedScore), size === 'sm' ? 'text-xs' : 'text-sm')}>
          {getLabel(clampedScore)}
        </span>
        <span className={cn('font-bold tabular-nums', getColor(clampedScore), size === 'sm' ? 'text-sm' : 'text-base')}>
          {clampedScore}%
        </span>
      </div>
      <div className={cn('w-full rounded-full bg-secondary', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('h-full rounded-full transition-all duration-700', getBg(clampedScore))}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}
