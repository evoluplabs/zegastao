import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  MessageCircle,
  Crown,
  Trophy,
  Dices,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { useReferral } from '@/hooks/useReferral';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/ui/Logo';
import { FEATURES } from '@/lib/features';

const BLOCKED_BETTING_PHASES = ['survival', 'reorganizing'];

export function Sidebar() {
  const { isPaid } = useSubscription();
  const referral = useReferral();
  const { profile } = useStore();

  const phase = profile?.financialPhase;
  // Em modo de teste (VITE_FEATURE_ZE_APOSTADOR=true), mostra para qualquer fase.
  const showBetting =
    FEATURES.ZE_APOSTADOR && (import.meta.env.DEV || !phase || !BLOCKED_BETTING_PHASES.includes(phase));

  const NAV = [
    { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: true },
    { to: '/financas', label: 'Finanças', icon: CreditCard },
    { to: '/transactions', label: 'Transações', icon: Receipt },
    { to: '/copilot', label: 'Copiloto', icon: MessageCircle },
    { to: '/journey', label: 'Jornada', icon: Trophy },
  ];

  return (
    <aside className="hidden md:flex md:w-56 flex-col border-r bg-card">
      <div className="px-4 py-4 border-b">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {showBetting && (
          <NavLink
            to="/apostas"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Dices className="h-4 w-4 shrink-0" />
            <span>Zé Apostador</span>
            <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary leading-none">
              Beta
            </span>
          </NavLink>
        )}
      </nav>

      <div className="border-t p-3 space-y-0.5">
        <button
          onClick={() => referral.share('sidebar')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Gift className="h-4 w-4 shrink-0" />
          Indicar um amigo
        </button>
        {!isPaid && (
          <NavLink
            to="/pricing"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Crown className="h-4 w-4 shrink-0" />
            Assinar Copiloto
          </NavLink>
        )}
      </div>
    </aside>
  );
}
