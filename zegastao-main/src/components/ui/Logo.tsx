import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'white';
  className?: string;
}

const sizes = {
  sm: { icon: 'h-7 w-7', text: 'text-sm', sub: 'text-[10px]' },
  md: { icon: 'h-9 w-9', text: 'text-base', sub: 'text-xs' },
  lg: { icon: 'h-12 w-12', text: 'text-xl', sub: 'text-sm' },
};

export function Logo({ size = 'md', showText = true, variant = 'default', className }: LogoProps) {
  const s = sizes[size];
  const isWhite = variant === 'white';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Icon mark — ZG compass */}
      <div className={cn(s.icon, 'relative shrink-0 rounded-xl overflow-hidden')}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="36" height="36" rx="9" fill={isWhite ? 'white' : '#1d4ed8'} />
          {/* Z shape */}
          <path
            d="M9 11h12l-10 14h12"
            stroke={isWhite ? '#1d4ed8' : 'white'}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Growth dot (green accent) */}
          <circle cx="27" cy="11" r="3.5" fill="#22c55e" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn(s.text, 'font-extrabold tracking-tight', isWhite ? 'text-white' : 'text-foreground')}>
            Zé Gastão
          </span>
          <span className={cn(s.sub, 'font-medium', isWhite ? 'text-white/60' : 'text-muted-foreground')}>
            Copiloto Financeiro
          </span>
        </div>
      )}
    </div>
  );
}
