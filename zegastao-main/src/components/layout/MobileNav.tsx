import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Upload,
  Receipt,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/journey', label: 'Trilha', icon: Map },
  { to: '/upload', label: 'Importar', icon: Upload },
  { to: '/transactions', label: 'Extrato', icon: Receipt },
  { to: '/copilot', label: 'Copiloto', icon: MessageCircle },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex border-t bg-card">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
