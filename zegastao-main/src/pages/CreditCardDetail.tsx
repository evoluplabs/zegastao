import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreditCards, useCardInstallments } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { CreditCardWizard } from '@/components/flows/CreditCardWizard';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatBRL, currentMonthStart } from '@/lib/utils';
import { CREDIT_CARD_BANKS } from '@/types';
import { updateUserDoc, addUserDoc } from '@/lib/firestore';
import { cn } from '@/lib/utils';

function months(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function CreditCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cards } = useCreditCards();
  const { data: installments } = useCardInstallments();
  const { data: allTx } = useTransactions(false);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(false);
  const [nextInvoiceValue, setNextInvoiceValue] = useState(0);
  const [savingNext, setSavingNext] = useState(false);

  const card = cards.find((c) => c.id === id);
  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Cartão não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/carteira')}>Voltar</Button>
      </div>
    );
  }

  const monthStart = currentMonthStart();
  const bankInfo = CREDIT_CARD_BANKS[card.bank];

  // Parcelas ativas deste cartão
  const cardInstallments = installments.filter((i) => i.cardId === id && i.status === 'active');

  // Gastos do mês neste cartão (transações com statementType=credit_card, quando houver cardId)
  // Por ora, mostramos transações do mês com categoria "Fatura cartão"
  const monthTx = allTx.filter((t) => t.date >= monthStart && t.amount < 0);

  // Valor das parcelas do mês
  const installmentTotal = cardInstallments.reduce((s, i) => s + i.monthlyAmount, 0);
  const currentInvoice = installmentTotal; // simplificado: expandir com gastos quando tiver cardId no transaction

  // Simulação de histórico de faturas (baseado em InvoiceTracker existente)
  const historyMonths = months(6).slice(1);

  const now = new Date();
  const dueDate = `${String(card.dueDay).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const closeDate = `${String(card.closingDay).padStart(2, '0')}/${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  async function saveNextInvoice() {
    if (!card) return;
    if (nextInvoiceValue <= 0) return;
    setSavingNext(true);
    await updateUserDoc('creditCards', card.id, { lastKnownInvoice: nextInvoiceValue });
    setSavingNext(false);
    setPayingInvoice(false);
  }

  const limitUsedPct = card.limit > 0 ? Math.min(100, (currentInvoice / card.limit) * 100) : 0;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/carteira')} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg flex-1">{card.name}</h1>
          <button onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {/* Card visual */}
        <div
          className="rounded-3xl p-5 text-white relative overflow-hidden min-h-[140px] flex flex-col justify-between"
          style={{ background: `linear-gradient(135deg, ${bankInfo.color}dd, ${bankInfo.color}88)` }}
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{bankInfo.emoji}</span>
              <span className="text-sm font-medium opacity-80">CRÉDITO</span>
            </div>
          </div>
          <div className="relative">
            <p className="text-xs opacity-70 mb-0.5">Fatura atual estimada</p>
            <p className="text-3xl font-bold">{formatBRL(currentInvoice)}</p>
            <p className="text-xs opacity-70 mt-1">Vence dia {card.dueDay} · Fecha dia {card.closingDay}</p>
          </div>
        </div>

        {/* Limite */}
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Limite</p>
            <p className="text-xs text-muted-foreground">{formatBRL(currentInvoice)} usado</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                limitUsedPct > 80 ? 'bg-destructive' : limitUsedPct > 50 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${limitUsedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Disponível: <span className="font-semibold text-foreground">{formatBRL(card.limit - currentInvoice)}</span></span>
            <span>Limite total: {formatBRL(card.limit)}</span>
          </div>
        </div>

        {/* Ações da fatura */}
        <div className="rounded-3xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Fatura de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Vence {dueDate} · Fecha {closeDate}</p>
          </div>
          {!payingInvoice ? (
            <div className="px-5 py-4 flex gap-2">
              <Button
                className="flex-1 rounded-2xl gap-2"
                onClick={() => setPayingInvoice(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Paguei a fatura
              </Button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-primary">Qual o valor da próxima fatura?</p>
              <CurrencyInput
                value={nextInvoiceValue}
                onChange={setNextInvoiceValue}
                placeholder="R$ 0,00"
                className="rounded-2xl h-12"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setPayingInvoice(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-2xl"
                  onClick={saveNextInvoice}
                  disabled={savingNext || nextInvoiceValue <= 0}
                >
                  {savingNext ? 'Salvando…' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Compras parceladas */}
        {cardInstallments.length > 0 && (
          <div className="rounded-3xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Compras parceladas</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatBRL(installmentTotal)}/mês neste cartão</p>
            </div>
            <div className="divide-y">
              {cardInstallments.map((inst) => (
                <div key={inst.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{inst.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {inst.paidInstallments}/{inst.installments} parcelas
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold">{formatBRL(inst.monthlyAmount)}/mês</p>
                    <div className="mt-0.5 h-1 w-16 rounded-full bg-muted overflow-hidden ml-auto">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (inst.paidInstallments / inst.installments) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de faturas */}
        <div className="rounded-3xl border bg-card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <p className="text-sm font-semibold">Histórico de faturas</p>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {historyOpen && (
            <div className="divide-y border-t">
              {historyMonths.map((ym) => (
                <div key={ym} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <p className="text-sm capitalize">{monthLabel(ym)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">— sem dados —</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {editing && <CreditCardWizard existing={card} onClose={() => setEditing(false)} />}
    </>
  );
}
