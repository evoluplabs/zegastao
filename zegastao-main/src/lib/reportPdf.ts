// Gera PDF de relatório mensal usando jspdf (texto nativo — sem html2canvas).
// Custo: zero. Funciona 100% no navegador.
import type { Transaction, Goal, Debt } from '@/types';

export interface ReportData {
  monthLabel: string;       // ex: "Maio/2025"
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  monthlyIncome: number;
}

function fmt(n: number): string {
  return `R$${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function sumByCategory(txs: Transaction[]): { name: string; amount: number }[] {
  const map: Record<string, number> = {};
  for (const t of txs.filter((t) => t.amount < 0)) {
    const cat = t.category || 'Outros';
    map[cat] = (map[cat] || 0) + Math.abs(t.amount);
  }
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export async function generateMonthlyReportPdf(data: ReportData): Promise<void> {
  // Importação lazy para não impactar o bundle inicial
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const W = doc.internal.pageSize.getWidth();
  const PX = 15; // padding lateral
  const COL = W - PX * 2;

  const incomes = data.transactions.filter((t) => t.amount > 0);
  const expenses = data.transactions.filter((t) => t.amount < 0);
  const totalIn = incomes.reduce((s, t) => s + t.amount, 0);
  const totalOut = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  const balance = totalIn - totalOut;
  const byCategory = sumByCategory(data.transactions);
  const positive = balance >= 0;

  // ── CAPA ──────────────────────────────────────────────────────────────────
  doc.setFillColor(positive ? 22 : 37, positive ? 163 : 99, positive ? 74 : 235);
  doc.rect(0, 0, W, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ZÉ GASTÃO · COPILOTO FINANCEIRO', W / 2, 20, { align: 'center' });

  doc.setFontSize(22);
  doc.text(`Relatório Mensal`, W / 2, 35, { align: 'center' });

  doc.setFontSize(14);
  doc.text(data.monthLabel, W / 2, 45, { align: 'center' });

  doc.setFontSize(28);
  doc.text(fmt(balance), W / 2, 65, { align: 'center' });
  doc.setFontSize(9);
  doc.text(positive ? 'Mês no azul ✔' : 'Mês no vermelho', W / 2, 72, { align: 'center' });

  // ── RESUMO ────────────────────────────────────────────────────────────────
  let y = 92;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resumo do Mês', PX, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const rows: [string, string][] = [
    ['Total de receitas', fmt(totalIn)],
    ['Total de despesas', fmt(totalOut)],
    ['Saldo do mês', fmt(balance)],
  ];

  for (const [label, value] of rows) {
    doc.text(label, PX, y);
    doc.text(value, W - PX, y, { align: 'right' });
    y += 7;
  }

  // ── GASTOS POR CATEGORIA ──────────────────────────────────────────────────
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Gastos por Categoria', PX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  for (const cat of byCategory.slice(0, 12)) {
    if (y > 270) { doc.addPage(); y = 20; }
    const pct = totalOut > 0 ? ((cat.amount / totalOut) * 100).toFixed(0) : '0';

    // Barra de proporção
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(PX, y - 3, COL, 5, 1, 1, 'F');
    const barW = Math.max(4, (cat.amount / totalOut) * COL);
    doc.setFillColor(positive ? 22 : 37, positive ? 163 : 99, positive ? 74 : 235);
    doc.roundedRect(PX, y - 3, barW, 5, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.text(cat.name, PX + 2, y + 0.5);

    doc.setTextColor(30, 30, 30);
    doc.text(`${fmt(cat.amount)} (${pct}%)`, W - PX, y, { align: 'right' });
    y += 8;
  }

  // ── METAS ─────────────────────────────────────────────────────────────────
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  if (activeGoals.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y += 6;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Progresso das Metas', PX, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const g of activeGoals.slice(0, 6)) {
      if (y > 270) { doc.addPage(); y = 20; }
      const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);

      doc.setFillColor(220, 220, 220);
      doc.roundedRect(PX, y - 3, COL, 5, 1, 1, 'F');
      doc.setFillColor(22, 163, 74);
      doc.roundedRect(PX, y - 3, (pct / 100) * COL, 5, 1, 1, 'F');

      doc.setTextColor(30, 30, 30);
      doc.text(g.name, PX + 2, y + 0.5);
      doc.text(`${fmt(g.currentAmount)} / ${fmt(g.targetAmount)} (${pct.toFixed(0)}%)`, W - PX, y, { align: 'right' });
      y += 8;
    }
  }

  // ── DÍVIDAS ATIVAS ────────────────────────────────────────────────────────
  const activeDebts = data.debts.filter((d) => d.status === 'active');
  if (activeDebts.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y += 6;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Dívidas Ativas', PX, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const d of activeDebts.slice(0, 8)) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${d.creditor}`, PX, y);
      doc.text(
        `Saldo: ${fmt(d.totalBalance)} · ${d.remainingInstallments}x de ${fmt(d.monthlyPayment)}`,
        W - PX,
        y,
        { align: 'right' }
      );
      y += 6;
    }
  }

  // ── RODAPÉ ────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Gerado pelo Zé Gastão · ${new Date().toLocaleDateString('pt-BR')} · Página ${i} de ${pages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `ze-gastao-${data.monthLabel.toLowerCase().replace(/\//g, '-').replace(/\s/g, '-')}.pdf`;
  doc.save(fileName);
}
