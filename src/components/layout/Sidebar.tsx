import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Receipt,
  CreditCard,
  Zap,
  Target,
  Map,
  PiggyBank,
  TrendingUp,
  FolderOpen,
  Brain,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journey', label: 'Trilha', icon: Map },
  { to: '/upload', label: 'Importar', icon: Upload },
  { to: '/transactions', label: 'Transações', icon: Receipt },
  { to: '/debts', label: 'Dívidas', icon: CreditCard },
  { to: '/projection', label: 'Projeção', icon: TrendingUp },
  { to: '/rules', label: 'Regras', icon: Zap },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/investments', label: 'Investimentos', icon: PiggyBank },
  { to: '/documents', label: 'Documentos', icon: FolderOpen },
  { to: '/context', label: 'Contexto', icon: Brain },
  { to: '/copilot', label: 'Copiloto', icon: MessageCircle },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 flex-col border-r bg-card">
      <div className="px-6 py-5">
        <span className="text-lg font-bold">💸 Copiloto</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
