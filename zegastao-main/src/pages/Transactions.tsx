import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, Plus, FileUp, ArrowRight, Trash2, ArrowLeft,
  CheckSquare, Square, ChevronDown, ChevronUp, FileText, Tag, ChevronRight,
} from 'lucide-react';
import { writeBatch, collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db, auth, functions } from '@/firebase';
import { useTransactions } from '@/hooks/useTransactions';
import { useUploads } from '@/hooks/useUploads';
import { useCategories } from '@/hooks/useCategories';
import { deleteUserDoc, updateUserDoc } from '@/lib/firestore';
import type { Transaction } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactionWizard } from '@/components/flows/TransactionWizard';
import { formatBRL, formatDateBR } from '@/lib/utils';

const categorizeManual = httpsCallable(functions, 'categorizeManual');
const SUPPORTED_BANKS = ['Nubank', 'Inter', 'Itaú', 'Bradesco', 'BB', 'Santander', 'C6', 'Caixa'];

interface MonthGroup {
  month: string;   // 'YYYY-MM'
  label: string;   // 'maio de 2026'
  net: number;
  count: number;
  txs: Transaction[];
}

// Agrupa as transações por mês no cliente (1 leitura da coleção, sem agregação
// server-side nem índice composto). A lista de um mês fica em memória e é
// filtrada localmente ao abrir o card — sem novas queries.
function groupByMonth(txs: Transaction[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const t of txs) {
    const month = (t.date || '').slice(0, 7); // 'YYYY-MM'
    if (!month) continue;
    let g = map.get(month);
    if (!g) {
      const [y, m] = month.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      g = { month, label, net: 0, count: 0, txs: [] };
      map.set(month, g);
    }
    g.net += t.amount;
    g.count += 1;
    g.txs.push(t);
  }
  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

export function Transactions() {
  const { data: transactions, loading } = useTransactions(false);
  const { data: uploads } = useUploads();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [batchesOpen, setBatchesOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);

  const groups = useMemo(() => groupByMonth(transactions), [transactions]);
  const current = selectedMonth ? groups.find((g) => g.month === selectedMonth) : null;
  const uploadsDone = uploads.filter((u) => u.status === 'done');

  async function deleteUploadBatch(uploadId: string) {
    const user = auth.currentUser;
    if (!user) return;
    setDeletingBatch(uploadId);
    try {
      const txQuery = query(
        collection(db, 'users', user.uid, 'transactions'),
        where('uploadId', '==', uploadId),
      );
      const snap = await getDocs(txQuery);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', user.uid, 'uploads', uploadId));
      await batch.commit();
    } finally {
      setDeletingBatch(null);
    }
  }

  // ── Detalhe de um mês ──
  if (current) {
    return (
      <>
        <MonthDetail group={current} onBack={() => setSelectedMonth(null)} />
        {openWizard && <TransactionWizard onClose={() => setOpenWizard(false)} />}
      </>
    );
  }

  // ── Visão geral: cards por mês ──
  return (
    <div className="space-y-4 pb-12">
      {/* Banner importar */}
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
          <Upload className="h-3.5 w-3.5" /> Importar <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4" /> Lançar manual
        </Button>
      </div>

      {/* Lotes importados */}
      {uploadsDone.length > 0 && (
        <Card>
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
            onClick={() => setBatchesOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Lotes importados ({uploadsDone.length})
            </span>
            {batchesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {batchesOpen && (
            <div className="border-t divide-y">
              {uploadsDone.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.totalTransactions ?? 0} transações
                      {u.bank && u.bank !== 'generico' ? ` · ${u.bank}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingBatch === u.id}
                    onClick={() => deleteUploadBatch(u.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingBatch === u.id ? 'Excluindo…' : 'Excluir lote'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Cards por mês */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Por mês</h2>
        {loading && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
        {!loading && groups.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhuma transação ainda. Importe um extrato ou lance manualmente.
              </p>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpenWizard(true)}>
                <Plus className="h-3.5 w-3.5" /> Lançar manualmente
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => (
            <button
              key={g.month}
              onClick={() => setSelectedMonth(g.month)}
              className="flex items-center justify-between rounded-xl border bg-card p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div>
                <p className="text-sm font-semibold capitalize">{g.label}</p>
                <p className="text-xs text-muted-foreground">{g.count} transações</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${g.net < 0 ? 'text-foreground' : 'text-success'}`}>
                  {formatBRL(g.net)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {openWizard && <TransactionWizard onClose={() => setOpenWizard(false)} />}
    </div>
  );
}

/* ───────────────── Detalhe: lista de UM mês (em memória) ───────────────── */

function MonthDetail({ group, onBack }: { group: MonthGroup; onBack: () => void }) {
  const { all: allCategories, custom: customCategories, add: addCategory, remove: removeCategory } = useCategories();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [openWizard, setOpenWizard] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const filtered = useMemo(() => group.txs.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [group.txs, search, category]);

  const { income, expense } = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of group.txs) {
      if (t.amount >= 0) income += t.amount; else expense += t.amount;
    }
    return { income, expense };
  }, [group.txs]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function exitSelectMode() { setSelectMode(false); setSelected(new Set()); }

  async function deleteSelected() {
    const user = auth.currentUser;
    if (!user || selected.size === 0) return;
    const batch = writeBatch(db);
    selected.forEach((id) => batch.delete(doc(db, 'users', user.uid, 'transactions', id)));
    await batch.commit();
    exitSelectMode();
  }

  async function changeCategory(id: string, newCat: string) {
    if (newCat === '__new__') { setAddingCategory(true); return; }
    await updateUserDoc('transactions', id, { category: newCat, userCorrected: true });
    try { await categorizeManual({ transactionId: id, category: newCat }); } catch { /* best-effort */ }
  }

  async function handleAddCategory() {
    const ok = await addCategory(newCategoryInput);
    if (ok) { setNewCategoryInput(''); setAddingCategory(false); }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" className="gap-1.5 px-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold capitalize leading-tight">{group.label}</h1>
          <p className="text-xs text-muted-foreground">{group.count} transações</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Entradas</p>
          <p className="text-sm font-bold text-success">{formatBRL(income)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Saídas</p>
          <p className="text-sm font-bold text-foreground">{formatBRL(expense)}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
          <p className={`text-sm font-bold ${group.net < 0 ? 'text-foreground' : 'text-success'}`}>
            {formatBRL(group.net)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select className="sm:w-44" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Todas categorias</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button size="default" variant="outline" className="shrink-0 gap-2" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4" /> Manual
        </Button>
        <Button
          size="default"
          variant={selectMode ? 'default' : 'outline'}
          className="shrink-0 gap-2"
          onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
        >
          <CheckSquare className="h-4 w-4" /> {selectMode ? 'Cancelar' : 'Selecionar'}
        </Button>
      </div>

      {/* Categorias personalizadas */}
      <div className="flex flex-wrap items-center gap-2">
        {customCategories.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium">
            <Tag className="h-3 w-3 text-muted-foreground" />{c}
            <button onClick={() => removeCategory(c)} className="ml-0.5 text-muted-foreground hover:text-destructive leading-none">×</button>
          </span>
        ))}
        {addingCategory ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus className="h-7 w-36 text-xs" placeholder="Nome da categoria"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setAddingCategory(false); }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAddCategory}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingCategory(false)}>×</Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            onClick={() => setAddingCategory(true)}
          >
            <Plus className="h-3 w-3" /> Categoria personalizada
          </button>
        )}
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada com este filtro.
            </p>
          )}
          <ul className="divide-y">
            {filtered.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-3">
                {selectMode && (
                  <button onClick={() => toggleSelect(t.id)} className="shrink-0 text-muted-foreground hover:text-primary">
                    {selected.has(t.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                  </button>
                )}
                {/* Row 1: description + amount + delete */}
                <div className="min-w-0 flex-1" style={{ minWidth: '120px' }}>
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateBR(t.date)}</span>
                    {t.aiCategorized && !t.userCorrected && (
                      <Badge variant="outline">IA {Math.round((t.aiConfidence || 0) * 100)}%</Badge>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${t.amount < 0 ? 'text-foreground' : 'text-success'}`}>
                  {formatBRL(t.amount)}
                </span>
                {!selectMode && (
                  <button
                    onClick={() => deleteUserDoc('transactions', t.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir transação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {/* Row 2 on mobile: category selector spans full width */}
                <div className="w-full sm:w-auto sm:order-none order-last">
                  <Select
                    className="h-8 w-full sm:w-40 text-xs"
                    value={t.category}
                    onChange={(e) => changeCategory(t.id, e.target.value)}
                  >
                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ Nova categoria…</option>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Exclusão em massa */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-between rounded-2xl border bg-card shadow-xl px-4 py-3">
            <span className="text-sm font-medium">{selected.size} selecionada{selected.size > 1 ? 's' : ''}</span>
            <Button size="sm" variant="destructive" className="gap-2" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      )}

      {openWizard && <TransactionWizard onClose={() => setOpenWizard(false)} />}
    </div>
  );
}
