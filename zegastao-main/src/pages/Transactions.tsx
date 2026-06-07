import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Search } from 'lucide-react';
import { functions } from '@/firebase';
import { useTransactions } from '@/hooks/useTransactions';
import { updateUserDoc } from '@/lib/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@/types';
import { formatBRL, formatDateBR } from '@/lib/utils';

const categorizeManual = httpsCallable(functions, 'categorizeManual');

export function Transactions() {
  const { data: transactions, loading } = useTransactions(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, category]);

  async function changeCategory(id: string, newCategory: string) {
    // Atualização otimista local + persistência que aprende no cache pessoal.
    await updateUserDoc('transactions', id, { category: newCategory, userCorrected: true });
    try {
      await categorizeManual({ transactionId: id, category: newCategory });
    } catch {
      /* a atualização local já valeu; o aprendizado de cache é best-effort */
    }
  }

  return (
    <div className="space-y-4">
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
        <Select className="sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
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
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <span
                  className={`w-24 text-right text-sm font-semibold ${
                    t.amount < 0 ? 'text-foreground' : 'text-success'
                  }`}
                >
                  {formatBRL(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
