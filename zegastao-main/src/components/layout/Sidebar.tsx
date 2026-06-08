import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  MessageCircle,
  Crown,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { Logo } from '@/components/ui/Logo';

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/financas', label: 'Finanças', icon: CreditCard },
  { to: '/transactions', label: 'Transações', icon: Receipt },
  { to: '/copilot', label: 'Copiloto', icon: MessageCircle },
  { to: '/journey', label: 'Jornada', icon: Trophy },
];

export function Sidebar() {
  const { isPaid } = useSubscription();

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
      </nav>

      <div className="border-t p-3">
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
