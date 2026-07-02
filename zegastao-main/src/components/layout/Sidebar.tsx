import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  MessageCircle,
  Crown,
  Trophy,
  Dices,
  Gift,
  FileSpreadsheet,
  HelpCircle,
  Users,
  PiggyBank,
  Package,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { useReferral } from '@/hooks/useReferral';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/ui/Logo';
import { FEATURES } from '@/lib/features';
import { useToast } from '@/components/ui/Toast';
import { CharacterPanel } from '@/components/CharacterPanel';
import { useUIMode } from '@/hooks/useUIMode';

const BLOCKED_BETTING_PHASES = ['survival', 'reorganizing'];

export function Sidebar() {
  const { isPaid } = useSubscription();
  const referral = useReferral();
  const { profile } = useStore();
  const { toast } = useToast();
  const { isClassic } = useUIMode();

  const phase = profile?.financialPhase;
  // Em modo de teste (VITE_FEATURE_ZE_APOSTADOR=true), mostra para qualquer fase.
  const showBetting =
    FEATURES.ZE_APOSTADOR && (import.meta.env.DEV || !phase || !BLOCKED_BETTING_PHASES.includes(phase));

  // IR Season: Janeiro a Abril
  const irMonth = new Date().getMonth() + 1;
  const isIRSeason = irMonth >= 1 && irMonth <= 4;

  const NAV = isClassic ? [
    { to: '/dashboard', label: 'Início', sub: 'Visão geral das finanças', icon: LayoutDashboard, end: true },
    { to: '/carteira', label: 'Carteira', sub: 'Contas, dívidas e metas', icon: CreditCard },
    { to: '/transactions', label: 'Transações', sub: 'Histórico e extratos', icon: Receipt },
    { to: '/copilot', label: 'Copiloto IA', sub: 'Análise e conselho', icon: MessageCircle },
  ] : [
    { to: '/dashboard', label: 'Castelo', sub: 'Visão geral do reino', icon: LayoutDashboard, end: true },
    { to: '/carteira', label: 'Arsenal', sub: 'Contas, bosses, dívidas', icon: CreditCard },
    { to: '/transactions', label: 'Livro de Ouro', sub: 'Histórico e extratos', icon: Receipt },
    { to: '/copilot', label: 'Sábio', sub: 'Conselho com IA', icon: MessageCircle },
    { to: '/journey', label: 'Quest Log', sub: 'Missões e conquistas', icon: Trophy },
    { to: '/vila', label: 'A Vila', sub: 'Aliados, ranking e hub', icon: Home },
  ];

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-card">
      <div className="px-4 py-4 border-b">
        <Logo size="sm" />
      </div>

      {/* Character panel compact — RPG only */}
      {!isClassic && (
        <div className="border-b">
          <CharacterPanel compact />
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, sub, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{label}</p>
              <p className="text-[10px] leading-tight opacity-60">{sub}</p>
            </div>
          </NavLink>
        ))}

        <NavLink
          to="/caixinha"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <PiggyBank className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{isClassic ? 'Caixinhas' : 'Cofre da Guilda'}</p>
            <p className="text-[10px] leading-tight opacity-60">{isClassic ? 'Metas de poupança' : 'Baú com meta diária'}</p>
          </div>
        </NavLink>

        <NavLink
          to="/inventario"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Package className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{isClassic ? 'Patrimônio' : 'Inventário'}</p>
            <p className="text-[10px] leading-tight opacity-60">{isClassic ? 'Seus ativos e itens' : 'Itens → Missões de venda'}</p>
          </div>
        </NavLink>

        {/* IR: sempre disponível, destaque em temporada Jan-Abr */}
        <NavLink
          to="/ir"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : isIRSeason
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span>Imposto de Renda</span>
          {isIRSeason && (
            <span className="ml-auto rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-none">
              Prazo
            </span>
          )}
        </NavLink>

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
            <span>Raids</span>
            <span className="ml-auto rounded-full bg-raid/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 leading-none">
              Beta
            </span>
          </NavLink>
        )}
      </nav>

      <div className="border-t p-3 space-y-0.5">
        <NavLink
          to="/ajuda"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          Ajuda
        </NavLink>
        <button
          onClick={async () => {
            const result = await referral.share('sidebar');
            if (result === 'copied') toast('Link copiado! Cole para indicar um amigo 🎉');
            else if (result === 'shared') toast('Indicação compartilhada! Obrigado 🎉');
            else if (result === 'fallback') toast(`Copie seu link: ${referral.referralUrl}`);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Gift className="h-4 w-4 shrink-0" />
          Indicar um amigo
        </button>
        <Link
          to="/referrals"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Users className="h-4 w-4 shrink-0" />
          Ver indicados
        </Link>
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
