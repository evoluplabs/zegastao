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
  Share2,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { useReferral } from '@/hooks/useReferral';

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
  const { isPaid } = useSubscription();
  const { share } = useReferral();

  return (
    <aside className="hidden md:flex md:w-60 flex-col border-r bg-card">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            C
          </div>
          <span className="font-bold">Copiloto</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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

      {/* Footer da sidebar */}
      <div className="border-t p-3 space-y-1.5">
        {!isPaid && (
          <NavLink
            to="/pricing"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Crown className="h-4 w-4 shrink-0" />
            Assinar Copiloto
          </NavLink>
        )}
        <button
          onClick={() => share('sidebar')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          Convidar amigo
        </button>
      </div>
    </aside>
  );
}
