import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, Plus, FileUp, ArrowRight, Trash2,
  CheckSquare, Square, ChevronDown, ChevronUp, FileText, Tag,
} from 'lucide-react';
import { writeBatch, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, functions } from '@/firebase';
import { useTransactions } from '@/hooks/useTransactions';
import { useUploads } from '@/hooks/useUploads';
import { useCategories } from '@/hooks/useCategories';
import { deleteUserDoc, updateUserDoc } from '@/lib/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactionWizard } from '@/components/flows/TransactionWizard';
import { formatBRL, formatDateBR } from '@/lib/utils';

const categorizeManual = httpsCallable(functions, 'categorizeManual');

const SUPPORTED_BANKS = ['Nubank', 'Inter', 'Itaú', 'Bradesco', 'BB', 'Santander', 'C6', 'Caixa'];

export function Transactions() {
  const { data: transactions, loading } = useTransactions(false);
  const { data: uploads } = useUploads();
  const { all: allCategories, custom: customCategories, add: addCategory, remove: removeCategory } = useCategories();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [openWizard, setOpenWizard] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchesOpen, setBatchesOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, category]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const user = auth.currentUser;
    if (!user) return;
    const batch = writeBatch(db);
    selected.forEach((id) => {
      batch.delete(doc(db, 'users', user.uid, 'transactions', id));
    });
    await batch.commit();
    exitSelectMode();
  }

  async function deleteSingle(id: string) {
    await deleteUserDoc('transactions', id);
  }

  async function deleteUploadBatch(uploadId: string) {
    const user = auth.currentUser;
    if (!user) return;
    setDeletingBatch(uploadId);
    try {
      // Deletar todas as transações do lote
      const txQuery = query(
        collection(db, 'users', user.uid, 'transactions'),
        where('uploadId', '==', uploadId)
      );
      const snap = await getDocs(txQuery);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      // Deletar o doc do upload também
      batch.delete(doc(db, 'users', user.uid, 'uploads', uploadId));
      await batch.commit();
    } finally {
      setDeletingBatch(null);
    }
  }

  async function changeCategory(id: string, newCat: string) {
    if (newCat === '__new__') return; // handled inline
    await updateUserDoc('transactions', id, { category: newCat, userCorrected: true });
    try { await categorizeManual({ transactionId: id, category: newCat }); } catch { /* best-effort */ }
  }

  async function handleAddCategory() {
    const ok = await addCategory(newCategoryInput);
    if (ok) { setNewCategoryInput(''); setAddingCategory(false); }
  }

  const uploadsDone = uploads.filter((u) => u.status === 'done');

  return (
    <div className="space-y-4 pb-24">
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
          <Upload className="h-3.5 w-3.5" />
          Importar
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Lotes de importação */}
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

      {/* Toolbar */}
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
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Button size="default" variant="outline" className="shrink-0 gap-2" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4" /> Lançar manual
        </Button>
        <Button
          size="default"
          variant={selectMode ? 'default' : 'outline'}
          className="shrink-0 gap-2"
          onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
        >
          <CheckSquare className="h-4 w-4" />
          {selectMode ? 'Cancelar' : 'Selecionar'}
        </Button>
      </div>

      {/* Gerenciar categorias personalizadas */}
      <div className="flex flex-wrap items-center gap-2">
        {customCategories.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {c}
            <button
              onClick={() => removeCategory(c)}
              className="ml-0.5 text-muted-foreground hover:text-destructive leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {addingCategory ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              className="h-7 w-36 text-xs"
              placeholder="Nome da categoria"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') setAddingCategory(false);
              }}
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
              <li key={t.id} className="flex items-center gap-2 p-3">
                {/* Checkbox / select mode */}
                {selectMode && (
                  <button onClick={() => toggleSelect(t.id)} className="shrink-0 text-muted-foreground hover:text-primary">
                    {selected.has(t.id)
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />}
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateBR(t.date)}</span>
                    {t.aiCategorized && !t.userCorrected && (
                      <Badge variant="outline">IA {Math.round((t.aiConfidence || 0) * 100)}%</Badge>
                    )}
                  </div>
                </div>

                {/* Selector de categoria (inclui personalizadas) */}
                <Select
                  className="h-8 w-40 text-xs"
                  value={t.category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setAddingCategory(true);
                    } else {
                      changeCategory(t.id, e.target.value);
                    }
                  }}
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">+ Nova categoria…</option>
                </Select>

                <span className={`w-24 text-right text-sm font-semibold ${t.amount < 0 ? 'text-foreground' : 'text-success'}`}>
                  {formatBRL(t.amount)}
                </span>

                {/* Excluir individual */}
                {!selectMode && (
                  <button
                    onClick={() => deleteSingle(t.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir transação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Barra de ação em massa (fixa no rodapé quando em modo de seleção) */}
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
