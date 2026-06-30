import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Plus,
  UserCircle,
  Receipt,
  ArrowDownCircle,
  Target,
  Upload,
  CreditCard,
  Package,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionSheet } from '@/components/ActionSheet';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { GoalWizard } from '@/components/flows/GoalWizard';
import { TransactionWizard } from '@/components/flows/TransactionWizard';

const NAV = [
  { to: '/dashboard', label: 'Castelo', icon: LayoutDashboard, end: true },
  { to: '/carteira', label: 'Arsenal', icon: Wallet },
  null, // FAB placeholder
  { to: '/vila', label: 'Vila', icon: Home },
  { to: '/profile', label: 'Ficha', icon: UserCircle },
];

export function MobileNav() {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openDebt, setOpenDebt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [openTx, setOpenTx] = useState(false);

  const actions = [
    {
      icon: <Receipt className="h-5 w-5" />,
      label: 'Lançar transação',
      description: 'Registrar entrada ou saída',
      onClick: () => setOpenTx(true),
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Importar extrato',
      description: 'Subir PDF do seu banco',
      onClick: () => navigate('/upload'),
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: 'Ver transações',
      description: 'Histórico completo',
      onClick: () => navigate('/transactions'),
    },
    {
      icon: <ArrowDownCircle className="h-5 w-5" />,
      label: 'Nova dívida',
      description: 'Cadastrar parcela ou fatura',
      onClick: () => setOpenDebt(true),
    },
    {
      icon: <Target className="h-5 w-5" />,
      label: 'Nova meta',
      description: 'Definir objetivo financeiro',
      onClick: () => setOpenGoal(true),
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: 'Inventário',
      description: 'Itens para vender → missões',
      onClick: () => navigate('/inventario'),
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex border-t bg-card" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map((item, idx) => {
          if (!item) {
            return (
              <div key="fab" className="flex flex-1 items-center justify-center -mt-5">
                <button
                  onClick={() => setSheetOpen(true)}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 text-primary-foreground active:scale-95 transition-transform"
                  aria-label="Ações rápidas"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="O que você quer fazer?"
        items={actions}
      />

      {openTx && <TransactionWizard onClose={() => setOpenTx(false)} />}
      {openDebt && <DebtWizard onClose={() => setOpenDebt(false)} />}
      {openGoal && <GoalWizard onClose={() => setOpenGoal(false)} />}
    </>
  );
}
