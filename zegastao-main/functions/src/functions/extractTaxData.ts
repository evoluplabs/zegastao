// Cloud Function callable: extrai dados relevantes ao IRPF a partir das transações do ano.
// Retorna deduções, rendimentos e alertas — sem custo de IA (análise rule-based).
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const Schema = z.object({ year: z.number().int().min(2020).max(2030) });

export interface TaxSummary {
  year: number;
  deductions: {
    medical: number;      // Saúde + Farmácia
    education: number;    // Educação
    donations: number;    // Doações
  };
  income: {
    salary: number;       // Salário recebido no ano
    investments: number;  // Rendimentos de investimentos (renda extra classificada)
    rental: number;       // Aluguéis recebidos
    other: number;        // Outras entradas
  };
  highlights: string[];    // Insights textuais para o copiloto
  obligations: {
    type: 'irpf' | 'dasn_mei' | 'carne_leao' | 'darf_ganho_capital';
    label: string;
    deadline: string; // 'YYYY-MM-DD'
    description: string;
  }[];
}

export const extractTaxData = onCall(
  { region: 'southamerica-east1' },
  async (request): Promise<TaxSummary> => {
    if (!request.auth) throw new Error('Não autenticado');

    const parsed = Schema.safeParse(request.data);
    if (!parsed.success) throw new Error('Ano inválido');

    const { year } = parsed.data;
    const uid = request.auth.uid;
    const db = getFirestore();

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Busca todas as transações do ano
    const txSnap = await db.collection('users').doc(uid).collection('transactions')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const transactions = txSnap.docs.map((d) => d.data() as {
      amount: number;
      category: string;
      description?: string;
    });

    // Categorias dedutíveis
    const MEDICAL_CATS = ['Saúde', 'Farmácia'];
    const EDU_CATS = ['Educação'];
    const DONATE_CATS = ['Doação'];

    const medical = transactions
      .filter((t) => t.amount < 0 && MEDICAL_CATS.includes(t.category))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const education = transactions
      .filter((t) => t.amount < 0 && EDU_CATS.includes(t.category))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const donations = transactions
      .filter((t) => t.amount < 0 && DONATE_CATS.includes(t.category))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Rendimentos
    const salary = transactions
      .filter((t) => t.amount > 0 && t.category === 'Salário')
      .reduce((s, t) => s + t.amount, 0);

    const investments = transactions
      .filter((t) => t.amount > 0 && t.category === 'Investimentos')
      .reduce((s, t) => s + t.amount, 0);

    const rental = transactions
      .filter((t) => t.amount > 0 && (
        t.category === 'Renda extra' ||
        /aluguel|locação/i.test(t.description || '')
      ))
      .reduce((s, t) => s + t.amount, 0);

    const other = transactions
      .filter((t) => t.amount > 0 && !['Salário', 'Investimentos', 'Transferência'].includes(t.category))
      .reduce((s, t) => s + t.amount, 0) - rental;

    // Highlights para o copiloto e para a tela IR
    const highlights: string[] = [];
    if (medical > 0) highlights.push(`Você tem R$${medical.toFixed(0)} em despesas médicas/farmácia — podem ser dedutíveis no IRPF.`);
    if (education > 0) highlights.push(`R$${education.toFixed(0)} em educação — confirme se são gastos com dependentes ou você mesmo para dedução.`);
    if (donations > 0) highlights.push(`R$${donations.toFixed(0)} em doações — verifique se são para entidades qualificadas (dedução limitada a 6% do imposto).`);
    if (salary > 0) highlights.push(`Rendimentos de salário: R$${salary.toFixed(0)} no ano.`);
    if (rental > 0) highlights.push(`Recebeu R$${rental.toFixed(0)} em aluguéis — declare na ficha de Rendimentos Recebidos.`);

    // Obrigações fiscais
    const obligations: TaxSummary['obligations'] = [
      {
        type: 'irpf',
        label: 'Declaração IRPF',
        deadline: `${year + 1}-04-30`,
        description: 'Prazo típico: até o último dia útil de abril do ano seguinte. Verifique o prazo exato no site da Receita Federal.',
      },
    ];

    // Carnê-Leão: renda autônoma/aluguel acima do mínimo de isenção
    if (rental > 1903.98 * 12 || other > 1903.98 * 12) {
      obligations.push({
        type: 'carne_leao',
        label: 'Carnê-Leão',
        deadline: `${year + 1}-01-31`,
        description: 'Você recebeu rendimentos de pessoa física. Verifique se precisa pagar Carnê-Leão mensalmente (rendimento > R$1.903,98/mês em 2024).',
      });
    }

    return {
      year,
      deductions: { medical, education, donations },
      income: { salary, investments, rental, other: Math.max(0, other) },
      highlights,
      obligations,
    };
  }
);
