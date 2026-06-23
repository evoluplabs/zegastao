import { useState, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { CheckSquare, Square, FileText, Download, AlertCircle, Loader2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { generateMonthlyReportPdf } from '@/lib/reportPdf';
import { useStore } from '@/store/useStore';
import { useDebts } from '@/hooks/useDebts';
import { useGoals } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import type { TaxSummary } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEAR = CURRENT_YEAR - 1; // IRPF é sobre o ano anterior

// Checklist de documentos para reunir antes de declarar
const CHECKLIST_ITEMS = [
  { id: 'cpf', label: 'CPF e RG (ou CNH)' },
  { id: 'informes', label: 'Informes de rendimentos do empregador (CLT)' },
  { id: 'banco_informes', label: 'Informes de rendimentos dos bancos/corretoras' },
  { id: 'notas_medico', label: 'Recibos e notas de despesas médicas' },
  { id: 'mensalidade', label: 'Comprovantes de mensalidade escolar / faculdade' },
  { id: 'aluguel', label: 'Recibos de aluguel pago ou recebido' },
  { id: 'previdencia', label: 'Informe de previdência privada (PGBL/VGBL)' },
  { id: 'deducao_dep', label: 'CPF dos dependentes (cônjuge, filhos)' },
];

function fmt(n: number): string {
  return formatBRL(n);
}

export function ImpostoRenda() {
  const profile = useStore((s) => s.profile);
  const { data: debts } = useDebts();
  const { data: goals } = useGoals();
  const { data: transactions } = useTransactions(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [taxData, setTaxData] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function fetchTaxData() {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ year: number }, TaxSummary>(functions, 'extractTaxData');
      const result = await fn({ year: TAX_YEAR });
      setTaxData(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao extrair dados.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!taxData) return;
    // Gera um PDF com os dados do IR como relatório de deduções
    const yearTx = transactions.filter(
      (t) => t.date >= `${TAX_YEAR}-01-01` && t.date <= `${TAX_YEAR}-12-31`
    );
    await generateMonthlyReportPdf({
      monthLabel: `Relatório IR ${TAX_YEAR}`,
      transactions: yearTx,
      goals,
      debts,
      monthlyIncome: profile?.monthlyIncome || 0,
    });
  }

  const totalDeductions = taxData
    ? taxData.deductions.medical + taxData.deductions.education + taxData.deductions.donations
    : 0;

  const totalIncome = taxData
    ? taxData.income.salary + taxData.income.investments + taxData.income.rental + taxData.income.other
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 dark:bg-blue-500/10 p-2.5">
          <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-base">Imposto de Renda {TAX_YEAR}</h2>
          <p className="text-xs text-muted-foreground">Organize sua declaração e encontre deduções</p>
        </div>
      </div>

      {/* Checklist de documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documentos para reunir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {CHECKLIST_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              {checked.has(item.id)
                ? <CheckSquare className="h-4 w-4 text-success shrink-0" />
                : <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <span className={`text-sm ${checked.has(item.id) ? 'line-through text-muted-foreground' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
          <div className="pt-1">
            <p className="text-xs text-muted-foreground">
              {checked.size} de {CHECKLIST_ITEMS.length} documentos reunidos
            </p>
            <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(checked.size / CHECKLIST_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise de deduções do app */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Deduções detectadas no app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!taxData && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                Analisamos suas transações de {TAX_YEAR} e identificamos despesas que podem ser dedutíveis no IRPF.
              </p>
              <Button onClick={fetchTaxData} className="w-full gap-2" disabled={loading}>
                <Receipt className="h-4 w-4" /> Analisar deduções de {TAX_YEAR}
              </Button>
            </>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando transações de {TAX_YEAR}…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {taxData && (
            <>
              {/* Deduções */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Possíveis deduções</p>
                <div className="space-y-2">
                  {[
                    { label: 'Saúde e farmácia', amount: taxData.deductions.medical },
                    { label: 'Educação', amount: taxData.deductions.education },
                    { label: 'Doações', amount: taxData.deductions.donations },
                  ].map(({ label, amount }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm">{label}</span>
                      <span className={`text-sm font-semibold ${amount > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {amount > 0 ? fmt(amount) : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-2 mt-1">
                    <span className="text-sm font-bold">Total dedutível estimado</span>
                    <span className="text-sm font-bold text-success">{fmt(totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Rendimentos */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rendimentos detectados</p>
                <div className="space-y-2">
                  {[
                    { label: 'Salário', amount: taxData.income.salary },
                    { label: 'Investimentos', amount: taxData.income.investments },
                    { label: 'Aluguel', amount: taxData.income.rental },
                    { label: 'Outros', amount: taxData.income.other },
                  ].map(({ label, amount }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm">{label}</span>
                      <span className={`text-sm font-semibold ${amount > 0 ? '' : 'text-muted-foreground'}`}>
                        {amount > 0 ? fmt(amount) : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-2 mt-1">
                    <span className="text-sm font-bold">Total rendimentos</span>
                    <span className="text-sm font-bold">{fmt(totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              {taxData.highlights.length > 0 && (
                <div className="space-y-2">
                  {taxData.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-blue-500 shrink-0">ℹ</span> {h}
                    </div>
                  ))}
                </div>
              )}

              {/* Obrigações */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Obrigações identificadas</p>
                {taxData.obligations.map((o) => (
                  <div key={o.type} className="rounded-xl border bg-secondary/30 p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{o.label}</Badge>
                      <span className="text-xs text-muted-foreground">Prazo: {o.deadline}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.description}</p>
                  </div>
                ))}
              </div>

              {/* Botão PDF */}
              <Button variant="outline" className="w-full gap-2" onClick={downloadPdf}>
                <Download className="h-4 w-4" /> Baixar relatório para IR
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Aviso legal */}
      <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-400">
        <p className="font-semibold">⚠️ Orientação educacional</p>
        <p className="mt-1 text-amber-700/80 dark:text-amber-400/70">
          As informações aqui apresentadas são baseadas nas transações registradas no app e têm caráter educacional.
          Consulte um contador para sua declaração oficial. A Receita Federal é o órgão competente para dúvidas fiscais.
        </p>
      </div>
    </div>
  );
}
