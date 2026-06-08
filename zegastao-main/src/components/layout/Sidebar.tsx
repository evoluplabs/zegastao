import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  MessageCircle,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/financas', label: 'Finanças', icon: CreditCard },
  { to: '/transactions', label: 'Transações', icon: Receipt },
  { to: '/copilot', label: 'Copiloto', icon: MessageCircle },
];

export function Sidebar() {
  const { isPaid } = useSubscription();

  return (
    <aside className="hidden md:flex md:w-56 flex-col border-r bg-card">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            C
          </div>
          <span className="font-bold">Copiloto</span>
        </div>
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
