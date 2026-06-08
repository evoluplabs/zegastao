import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Plus, FileUp, ArrowRight } from 'lucide-react';
import { functions } from '@/firebase';
import { useTransactions } from '@/hooks/useTransactions';
import { updateUserDoc } from '@/lib/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactionWizard } from '@/components/flows/TransactionWizard';
import { CATEGORIES } from '@/types';
import { formatBRL, formatDateBR } from '@/lib/utils';

const categorizeManual = httpsCallable(functions, 'categorizeManual');

const SUPPORTED_BANKS = ['Nubank', 'Inter', 'Itaú', 'Bradesco', 'BB', 'Santander', 'C6', 'Caixa'];

export function Transactions() {
  const { data: transactions, loading } = useTransactions(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [openWizard, setOpenWizard] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, category]);

  async function changeCategory(id: string, newCategory: string) {
    await updateUserDoc('transactions', id, { category: newCategory, userCorrected: true });
    try {
      await categorizeManual({ transactionId: id, category: newCategory });
    } catch {
      /* best-effort */
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner de importação compacto → leva ao fluxo guiado */}
      <div
        className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-dashed bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigate('/upload')}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Importar extrato do banco</p>
            <p className="text-xs text-muted-foreground">
              Te guio passo a passo · {SUPPORTED_BANKS.slice(0, 5).join(', ')} e mais
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-2 pointer-events-none">
          <Upload className="h-3.5 w-3.5" />
          Importar
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Barra de busca + filtro + botão manual */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select className="sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Button size="default" variant="outline" className="shrink-0 gap-2" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4" />
          Lançar manual
        </Button>
      </div>

      {/* Lista de transações */}
      <Card>
        <CardContent className="p-0">
          {loading && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {transactions.length === 0
                  ? 'Nenhuma transação ainda. Importe um extrato ou lance manualmente.'
                  : 'Nenhuma transação encontrada com este filtro.'}
              </p>
              {transactions.length === 0 && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpenWizard(true)}>
                  <Plus className="h-3.5 w-3.5" /> Lançar manualmente
                </Button>
              )}
            </div>
          )}
          <ul className="divide-y">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateBR(t.date)}</span>
                    {t.aiCategorized && !t.userCorrected && (
                      <Badge variant="outline">
                        IA {Math.round((t.aiConfidence || 0) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <Select
                  className="h-8 w-40 text-xs"
                  value={t.category}
                  onChange={(e) => changeCategory(t.id, e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <span className={`w-24 text-right text-sm font-semibold ${t.amount < 0 ? 'text-foreground' : 'text-success'}`}>
                  {formatBRL(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {openWizard && <TransactionWizard onClose={() => setOpenWizard(false)} />}
    </div>
  );
}
