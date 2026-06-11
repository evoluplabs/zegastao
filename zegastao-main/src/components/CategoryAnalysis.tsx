import { useMemo } from 'react';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

interface CategoryItem {
  name: string;
  amount: number;
}

interface Props {
  categories: CategoryItem[];
  income: number;
  transactions?: Transaction[]; // para calcular frequência
}

const BENCHMARKS: Record<string, { ideal: number; label: string; tip?: string }> = {
  'Moradia':        { ideal: 35, label: 'ideal', tip: 'Considere dividir o imóvel, alugar um cômodo ou renegociar o aluguel.' },
  'Alimentação':    { ideal: 25, label: 'ideal', tip: 'Planeje o cardápio da semana e vá ao mercado com lista — evita compra por impulso.' },
  'Mercado':        { ideal: 20, label: 'ideal', tip: 'Compare preços em 2 supermercados e prefira marcas próprias — economiza ~20%.' },
  'Transporte':     { ideal: 15, label: 'ideal', tip: 'Combine transporte público + app só quando necessário. Caronas solidárias economizam até 60%.' },
  'Transporte app': { ideal: 5,  label: 'ideal', tip: 'Limite corridas por app a situações essenciais. Use o transporte público no dia a dia.' },
  'Combustível':    { ideal: 10, label: 'ideal', tip: 'Evite acelerar bruscamente, calibre pneus mensalmente e compare preços nos postos da rota.' },
  'Saúde':          { ideal: 10, label: 'ideal', tip: 'Verifique se o plano de saúde da empresa é mais barato que o particular.' },
  'Farmácia':       { ideal: 5,  label: 'ideal', tip: 'Peça ao médico a versão genérica dos medicamentos — até 80% mais barato.' },
  'Lazer':          { ideal: 10, label: 'ideal', tip: 'Substitua 1 saída cara por opções gratuitas (parques, eventos, cinema com meia-entrada).' },
  'Educação':       { ideal: 10, label: 'ideal', tip: 'Coursera, Alura e YouTube têm conteúdo de qualidade gratuito ou barato.' },
  'Streaming':      { ideal: 3,  label: 'ideal', tip: 'Compartilhe planos familiares ou cancele serviços que usa menos de 2x por semana.' },
  'Delivery':       { ideal: 8,  label: 'ideal', tip: 'Limite a 2 pedidos por semana e aproveite promoções de quarta — economiza ~R$200/mês.' },
  'Restaurantes':   { ideal: 8,  label: 'ideal', tip: 'Prefira o almoço executivo ao invés do jantar à la carte — até 50% mais barato.' },
  'Beleza':         { ideal: 5,  label: 'ideal', tip: 'Espaçe os procedimentos e veja tutoriais para fazer em casa o que der.' },
  'Vestuário':      { ideal: 5,  label: 'ideal', tip: 'Antes de comprar, espere 48h — se ainda quiser, a compra foi planejada.' },
};

// Categorias que vale mostrar frequência
const FREQ_CATEGORIES = new Set(['Delivery', 'Transporte app', 'Restaurantes', 'Lazer', 'Beleza']);

function pctColor(actual: number, ideal: number): string {
  const ratio = actual / ideal;
  if (ratio <= 0.85) return 'bg-green-500';
  if (ratio <= 1.1)  return 'bg-yellow-400';
  return 'bg-red-500';
}

function textColor(actual: number, ideal: number): string {
  const ratio = actual / ideal;
  if (ratio <= 0.85) return 'text-green-600';
  if (ratio <= 1.1)  return 'text-yellow-600';
  return 'text-red-600';
}

export function CategoryAnalysis({ categories, income, transactions = [] }: Props) {
  // Frequência por categoria (neste mês)
  const freqMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0) map[t.category] = (map[t.category] || 0) + 1;
    }
    return map;
  }, [transactions]);

  const enriched = useMemo(() => {
    return categories.map((c) => {
      const pct   = income > 0 ? (c.amount / income) * 100 : 0;
      const bench = BENCHMARKS[c.name];
      const freq  = freqMap[c.name] || 0;
      return { ...c, pct, bench, freq };
    });
  }, [categories, income, freqMap]);

  const overBudget = enriched.filter((c) => c.bench && c.pct > c.bench.ideal * 1.1);

  if (enriched.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Alerta acima do recomendado */}
      {overBudget.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-400">
          <p className="font-semibold mb-1">⚠️ Acima do recomendado:</p>
          <p>{overBudget.map((c) => c.name).join(', ')}</p>
        </div>
      )}

      <div className="space-y-2.5">
        {enriched.map((c) => {
          const barWidth  = Math.min(100, c.pct);
          const idealWidth = c.bench ? Math.min(100, c.bench.ideal) : null;
          const avgPerTx  = c.freq > 0 ? c.amount / c.freq : 0;
          const isFreqCat = FREQ_CATEGORIES.has(c.name) && c.freq > 0;
          const overBudgetValue = c.bench && c.pct > c.bench.ideal * 1.1
            ? c.amount - (c.bench.ideal / 100) * income
            : 0;

          return (
            <div key={c.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground truncate max-w-[50%]">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {isFreqCat && (
                    <span className="text-[10px] text-muted-foreground">
                      {c.freq}x · ~{formatBRL(avgPerTx)}/vez
                    </span>
                  )}
                  <span className="font-semibold">{formatBRL(c.amount)}</span>
                  {income > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      c.bench
                        ? textColor(c.pct, c.bench.ideal)
                        : 'text-muted-foreground'
                    )}>
                      {c.pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="relative h-1.5 rounded-full bg-secondary overflow-visible">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', c.bench ? pctColor(c.pct, c.bench.ideal) : 'bg-primary/50')}
                  style={{ width: `${barWidth}%` }}
                />
                {idealWidth && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-muted-foreground/40"
                    style={{ left: `${idealWidth}%` }}
                    title={`Ideal: ${c.bench?.ideal}%`}
                  />
                )}
              </div>

              {/* Texto de benchmark + dica */}
              {c.bench && (
                <div className="mt-0.5 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {c.pct > c.bench.ideal * 1.1
                      ? `${(c.pct - c.bench.ideal).toFixed(0)}% acima do ${c.bench.label} (${c.bench.ideal}%)`
                      : `Ideal: até ${c.bench.ideal}% da renda`}
                  </p>
                  {c.pct > c.bench.ideal * 1.1 && c.bench.tip && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                      💡 {c.bench.tip}
                    </p>
                  )}
                </div>
              )}

              {/* Simulação de redução para categorias de frequência */}
              {isFreqCat && overBudgetValue > 0 && income > 0 && (
                <p className="text-[10px] text-primary mt-0.5">
                  ✂️ Reduzindo pela metade: economizaria {formatBRL(overBudgetValue * 0.5)}/mês
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Benchmarks baseados na regra 50-30-20 adaptada para o Brasil.
      </p>
    </div>
  );
}
