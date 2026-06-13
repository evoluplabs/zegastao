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
      {/* ZG monogram mark */}
      <div className={cn(s.icon, 'relative shrink-0 rounded-xl overflow-hidden')}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isWhite ? '#ffffff' : '#0d9068'} />
              <stop offset="100%" stopColor={isWhite ? '#ccfbf1' : '#22c55e'} />
            </linearGradient>
          </defs>
          <rect width="36" height="36" rx="9" fill="url(#logoGrad)" />
          {/* Z letter */}
          <path
            d="M8 11.5h9l-8 12h9"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* G letter */}
          <path
            d="M22 14.5c-1.5-1.5-4.5-1-4.5 3.5s2 5 4.5 3.5v-2.5h-2"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
