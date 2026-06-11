import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Debts } from './Debts';
import { Goals } from './Goals';
import { Rules } from './Rules';
import { Investments } from './Investments';
import { Projection } from './Projection';
import { Fire } from './Fire';

const TABS = [
  { id: 'debts', label: 'Dívidas' },
  { id: 'goals', label: 'Metas' },
  { id: 'rules', label: 'Regras' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'projection', label: 'Projeção' },
  { id: 'fire', label: '🔥 Liberdade' },
] as const;

type TabId = typeof TABS[number]['id'];

export function Financas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [active, setActive] = useState<TabId>(
    TABS.find((t) => t.id === tabParam)?.id ?? 'debts'
  );

  useEffect(() => {
    if (tabParam && TABS.find((t) => t.id === tabParam)) {
      setActive(tabParam as TabId);
    }
  }, [tabParam]);

  function switchTab(id: TabId) {
    setActive(id);
    setSearchParams({ tab: id }, { replace: true });
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              active === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab ativa */}
      <div>
        {active === 'debts' && <Debts />}
        {active === 'goals' && <Goals />}
        {active === 'rules' && <Rules />}
        {active === 'investments' && <Investments />}
        {active === 'projection' && <Projection />}
        {active === 'fire' && <Fire />}
      </div>
    </div>
  );
}
