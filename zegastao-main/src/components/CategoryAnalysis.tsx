import { useMemo } from 'react';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CategoryItem {
  name: string;
  amount: number;
}

interface Props {
  categories: CategoryItem[];
  income: number;
}

const BENCHMARKS: Record<string, { ideal: number; label: string; tip?: string }> = {
  'Moradia': { ideal: 35, label: 'ideal', tip: 'Considere um cômodo para alugar, dividir o imóvel ou renegociar o aluguel.' },
  'Alimentação': { ideal: 25, label: 'ideal', tip: 'Planeje as refeições da semana e faça uma lista antes do mercado para evitar compras por impulso.' },
  'Mercado': { ideal: 20, label: 'ideal', tip: 'Compare preços em 2 supermercados e priorize marcas próprias — economia média de 20%.' },
  'Transporte': { ideal: 15, label: 'ideal', tip: 'Combine transporte público + app somente quando necessário. Caronas solidárias economizam até 60%.' },
  'Transporte app': { ideal: 5, label: 'ideal', tip: 'Limite corridas por app a situações essenciais. Use o transporte público no dia a dia.' },
  'Combustível': { ideal: 10, label: 'ideal', tip: 'Evite acelerar bruscamente, calibre pneus mensalmente e compare preços nos postos da rota.' },
  'Saúde': { ideal: 10, label: 'ideal', tip: 'Verifique se o plano de saúde da empresa é mais barato que o particular.' },
  'Farmácia': { ideal: 5, label: 'ideal', tip: 'Peça ao médico a versão genérica dos medicamentos — até 80% mais barato.' },
  'Lazer': { ideal: 10, label: 'ideal', tip: 'Substitua 1 saída cara por mês por lazer gratuito (parques, eventos, cinema com ingresso-meia).' },
  'Educação': { ideal: 10, label: 'ideal', tip: 'Plataformas como Coursera, Alura e YouTube têm conteúdo gratuito de qualidade.' },
  'Streaming': { ideal: 3, label: 'ideal', tip: 'Compartilhe planos familiares ou cancele serviços que usa menos de 2x por semana.' },
  'Delivery': { ideal: 8, label: 'ideal', tip: 'Limite a 2 pedidos por semana e aproveite promoções de quarta — economiza ~R$200/mês.' },
  'Restaurantes': { ideal: 8, label: 'ideal', tip: 'Prefira o almoço executivo ao invés do jantar à la carte — até 50% mais barato.' },
};

function pctColor(actual: number, ideal: number): string {
  const ratio = actual / ideal;
  if (ratio <= 0.85) return 'bg-green-500';
  if (ratio <= 1.1) return 'bg-yellow-400';
  return 'bg-red-500';
}

function textColor(actual: number, ideal: number): string {
  const ratio = actual / ideal;
  if (ratio <= 0.85) return 'text-green-600';
  if (ratio <= 1.1) return 'text-yellow-600';
  return 'text-red-600';
}

export function CategoryAnalysis({ categories, income }: Props) {
  const enriched = useMemo(() => {
    return categories.map((c) => {
      const pct = income > 0 ? (c.amount / income) * 100 : 0;
      const bench = BENCHMARKS[c.name];
      return { ...c, pct, bench };
    });
  }, [categories, income]);

  const overBudget = enriched.filter((c) => c.bench && c.pct > c.bench.ideal * 1.1);

  if (enriched.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Alertas */}
      {overBudget.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">⚠️ Acima do recomendado:</p>
          <p>{overBudget.map((c) => c.name).join(', ')}</p>
        </div>
      )}

      <div className="space-y-2.5">
        {enriched.map((c) => {
          const barWidth = Math.min(100, c.pct);
          const idealWidth = c.bench ? Math.min(100, c.bench.ideal) : null;

          return (
            <div key={c.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground truncate max-w-[50%]">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold">{formatBRL(c.amount)}</span>
                  {income > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      c.bench
                        ? cn(textColor(c.pct, c.bench.ideal), 'bg-current/10')
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
                {/* Ideal marker */}
                {idealWidth && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-muted-foreground/40"
                    style={{ left: `${idealWidth}%` }}
                    title={`Ideal: ${c.bench?.ideal}%`}
                  />
                )}
              </div>
              {c.bench && (
                <div className="mt-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {c.pct > c.bench.ideal * 1.1
                      ? `${(c.pct - c.bench.ideal).toFixed(0)}% acima do ${c.bench.label} (${c.bench.ideal}%)`
                      : `Ideal: até ${c.bench.ideal}% da renda`}
                  </p>
                  {c.pct > c.bench.ideal * 1.1 && c.bench.tip && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
                      💡 {c.bench.tip}
                    </p>
                  )}
                </div>
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
