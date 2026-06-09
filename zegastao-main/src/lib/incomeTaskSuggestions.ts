// Gerador de sugestões de renda extra local (sem API).
// Usa habilidades do usuário + situação de dívidas para criar tarefas específicas e acionáveis.

import type { Debt, Goal } from '@/types';

export interface IncomeTask {
  id: string;
  title: string;
  detail: string;
  platform?: string;
  estimatedReturn: string;
  estimatedReturnValue: number; // para ordenar
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'renda_extra';
  debtContext?: string; // "cobriria 30% da parcela do Nubank"
  skillRequired?: string;
}

// Catálogo de tarefas por habilidade
const SKILL_TASKS: Record<string, Omit<IncomeTask, 'id' | 'category' | 'debtContext'>[]> = {
  'Programação': [
    { title: 'Criar landing page para pequeno negócio local', detail: 'Ofereça serviço de criação de site simples para lojistas, salões ou consultórios da sua cidade.', platform: 'GetNinjas / indica pessoal', estimatedReturn: 'R$ 300–800', estimatedReturnValue: 550, estimatedTime: '2–4h', difficulty: 'easy', skillRequired: 'Programação' },
    { title: 'Fazer manutenção/ajuste em site WordPress', detail: 'Muitos empresários têm sites com problemas simples — atualizar plugins, corrigir erros, otimizar.', platform: 'Workana / Freelancer', estimatedReturn: 'R$ 150–400', estimatedReturnValue: 275, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Programação' },
    { title: 'Script de automação para planilhas (Excel/Sheets)', detail: 'Automatize tarefas repetitivas para empresas. Alta demanda, curto prazo.', platform: 'GetNinjas / LinkedIn', estimatedReturn: 'R$ 200–600', estimatedReturnValue: 400, estimatedTime: '3–5h', difficulty: 'medium', skillRequired: 'Programação' },
  ],
  'Design': [
    { title: 'Criar artes para redes sociais (pacote mensal)', detail: 'Pequenos negócios precisam de posts semanais. Ofereça pacote de 8 posts por mês.', platform: 'Instagram / GetNinjas', estimatedReturn: 'R$ 250–600', estimatedReturnValue: 425, estimatedTime: '4–6h/mês', difficulty: 'easy', skillRequired: 'Design' },
    { title: 'Logo e identidade visual para MEI', detail: 'MEIs em fase inicial precisam de logo. Entregue em 48h com 2 variações.', platform: '99designs / direto', estimatedReturn: 'R$ 150–400', estimatedReturnValue: 275, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Design' },
    { title: 'Edição de cardápio digital para restaurante', detail: 'Restaurantes precisam atualizar cardápios digitais frequentemente.', platform: 'Direto / WhatsApp', estimatedReturn: 'R$ 100–250', estimatedReturnValue: 175, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Design' },
  ],
  'Redação': [
    { title: 'Escrever artigos de blog para empresas', detail: 'Produza conteúdo SEO para pequenas empresas que precisam de blog ativo.', platform: 'Workana / Upwork', estimatedReturn: 'R$ 80–200 por artigo', estimatedReturnValue: 140, estimatedTime: '1–2h por artigo', difficulty: 'easy', skillRequired: 'Redação' },
    { title: 'Criar descrições de produtos para e-commerce', detail: 'Lojistas online precisam de copywriting para fichas de produto. Alta demanda.', platform: 'Elo7 / Mercado Livre / direto', estimatedReturn: 'R$ 150–400', estimatedReturnValue: 275, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Redação' },
  ],
  'Idiomas': [
    { title: 'Dar aulas de inglês online (1h/dia)', detail: 'Plataformas como iTalki e Preply conectam professores a alunos globalmente.', platform: 'iTalki / Preply', estimatedReturn: 'R$ 40–80/h', estimatedReturnValue: 60, estimatedTime: '1h/aula', difficulty: 'easy', skillRequired: 'Idiomas' },
    { title: 'Traduzir documentos e textos técnicos', detail: 'Documentos jurídicos, técnicos e acadêmicos pagam bem por tradução humana.', platform: 'ProZ / direto', estimatedReturn: 'R$ 200–500', estimatedReturnValue: 350, estimatedTime: '4–6h', difficulty: 'medium', skillRequired: 'Idiomas' },
  ],
  'Aulas particulares': [
    { title: 'Dar reforço escolar (matemática ou ciências)', detail: 'Alta demanda no período escolar. 2–3 alunos já fazem diferença no mês.', platform: 'Superprof / boca a boca', estimatedReturn: 'R$ 40–80/h', estimatedReturnValue: 60, estimatedTime: '1h/aula', difficulty: 'easy', skillRequired: 'Aulas particulares' },
    { title: 'Preparar aluno para ENEM/vestibular', detail: 'Alunos em reta final pagam mais por tutoria intensiva. Pacotes de 10h.', platform: 'Superprof / direto', estimatedReturn: 'R$ 400–900 por pacote', estimatedReturnValue: 650, estimatedTime: '10h', difficulty: 'medium', skillRequired: 'Aulas particulares' },
  ],
  'Culinária': [
    { title: 'Vender marmitas saudáveis na vizinhança', detail: 'Foco em 10–20 clientes fixos. Entrega semanal. Baixo custo de entrada.', platform: 'WhatsApp / Canais vizinhança', estimatedReturn: 'R$ 400–1.200/mês', estimatedReturnValue: 800, estimatedTime: '4–6h/semana', difficulty: 'medium', skillRequired: 'Culinária' },
    { title: 'Fazer bolos e doces por encomenda', detail: 'Confeitaria sob encomenda com entrega local. Alta margem em datas festivas.', platform: 'Instagram / WhatsApp', estimatedReturn: 'R$ 100–400 por encomenda', estimatedReturnValue: 250, estimatedTime: '3–5h', difficulty: 'easy', skillRequired: 'Culinária' },
  ],
  'Fotografia': [
    { title: 'Fotos de produto para lojas virtuais', detail: 'Lojistas precisam de fotos profissionais para vender online. Pacote de 20 fotos.', platform: 'Instagram / Elo7 / GetNinjas', estimatedReturn: 'R$ 200–500', estimatedReturnValue: 350, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Fotografia' },
    { title: 'Ensaio família/infantil aos fins de semana', detail: 'Ensaios rápidos de 1h em parque ou estúdio. Alta demanda o ano todo.', platform: 'Instagram / indicações', estimatedReturn: 'R$ 250–600', estimatedReturnValue: 425, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Fotografia' },
  ],
  'Edição de vídeo': [
    { title: 'Editar vídeos para criadores de conteúdo', detail: 'YouTubers e influencers precisam de editores. Pague por vídeo ou pacote mensal.', platform: 'Workana / direto', estimatedReturn: 'R$ 80–300 por vídeo', estimatedReturnValue: 190, estimatedTime: '2–4h por vídeo', difficulty: 'easy', skillRequired: 'Edição de vídeo' },
    { title: 'Criar Reels/TikToks para empresas locais', detail: 'Negócios locais precisam de conteúdo em vídeo curto. Alta demanda.', platform: 'Instagram / direto', estimatedReturn: 'R$ 150–400/mês', estimatedReturnValue: 275, estimatedTime: '3–4h/mês', difficulty: 'easy', skillRequired: 'Edição de vídeo' },
  ],
  'Marcenaria': [
    { title: 'Montar/instalar móveis para clientes', detail: 'Entregas de Madeiranit, IKEA etc. precisam de montagem. Pague por visita.', platform: 'GetNinjas / OLX', estimatedReturn: 'R$ 100–250 por serviço', estimatedReturnValue: 175, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Marcenaria' },
    { title: 'Fazer pequenos consertos e reformas', detail: 'Porta arranhada, gaveta quebrada, pintura simples. Alta frequência.', platform: 'GetNinjas / Parafuso', estimatedReturn: 'R$ 80–200 por serviço', estimatedReturnValue: 140, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Marcenaria' },
  ],
  'Elétrica': [
    { title: 'Instalação de tomadas/luminárias residenciais', detail: 'Serviço de baixa complexidade com alta demanda constante.', platform: 'GetNinjas / Parafuso', estimatedReturn: 'R$ 100–300 por serviço', estimatedReturnValue: 200, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Elétrica' },
  ],
  'Vendas': [
    { title: 'Revender produtos no Mercado Livre', detail: 'Compre no atacado (Martins, Aliexpress) e revenda com margem. Sem estoque físico com dropshipping.', platform: 'Mercado Livre', estimatedReturn: 'R$ 300–800/mês', estimatedReturnValue: 550, estimatedTime: '3–4h setup + 1h/dia', difficulty: 'medium', skillRequired: 'Vendas' },
    { title: 'Consultoria de vendas para microempreendedor', detail: 'Use sua experiência para ajudar MEIs a melhorar vendas por hora.', platform: 'LinkedIn / direto', estimatedReturn: 'R$ 100–300/h', estimatedReturnValue: 200, estimatedTime: '1–2h', difficulty: 'medium', skillRequired: 'Vendas' },
  ],
  'Marketing': [
    { title: 'Gestão de redes sociais para negócio local', detail: 'Pacote mensal: planejamento + criação + publicação de 3x por semana.', platform: 'LinkedIn / GetNinjas', estimatedReturn: 'R$ 400–800/mês', estimatedReturnValue: 600, estimatedTime: '5–8h/mês', difficulty: 'easy', skillRequired: 'Marketing' },
    { title: 'Configurar e gerenciar campanhas Google Ads', detail: 'Pequenas empresas precisam de tráfego pago mas não sabem fazer. Cobre mensalidade.', platform: 'LinkedIn / indicações', estimatedReturn: 'R$ 300–600/mês', estimatedReturnValue: 450, estimatedTime: '4–6h setup', difficulty: 'medium', skillRequired: 'Marketing' },
  ],
  'Costura': [
    { title: 'Ajustes e consertos de roupa', detail: 'Barras, zíperes, ajuste de tamanho. Baixo custo, alta frequência.', platform: 'Boca a boca / OLX', estimatedReturn: 'R$ 20–80 por peça', estimatedReturnValue: 50, estimatedTime: '30min–1h', difficulty: 'easy', skillRequired: 'Costura' },
  ],
  'Beleza': [
    { title: 'Fazer sobrancelha/depilação em domicílio', detail: 'Atendimento a domicílio cobra 30–50% mais que salão. Alta recorrência.', platform: 'WhatsApp / Instagram', estimatedReturn: 'R$ 40–100 por cliente', estimatedReturnValue: 70, estimatedTime: '30–45min', difficulty: 'easy', skillRequired: 'Beleza' },
    { title: 'Manicure/pedicure em domicílio', detail: 'Crie agenda fixos para fins de semana. 3 clientes já pagam uma parcela.', platform: 'WhatsApp / boca a boca', estimatedReturn: 'R$ 50–120 por cliente', estimatedReturnValue: 85, estimatedTime: '1h por cliente', difficulty: 'easy', skillRequired: 'Beleza' },
  ],
};

// Tarefas universais (independente de habilidade)
const UNIVERSAL_TASKS: Omit<IncomeTask, 'id' | 'category' | 'debtContext'>[] = [
  { title: 'Vender itens parados no Facebook Marketplace', detail: 'Eletrônicos, roupas, móveis — qualquer coisa que não usa vira dinheiro para a parcela.', platform: 'Facebook Marketplace / OLX', estimatedReturn: 'R$ 100–500', estimatedReturnValue: 300, estimatedTime: '1h para postar', difficulty: 'easy' },
  { title: 'Fazer entregas com iFood / Rappi (1 turno/semana)', detail: 'Apenas 1 turno de 4h por semana já gera uma renda complementar significativa.', platform: 'iFood / Rappi', estimatedReturn: 'R$ 80–160/turno', estimatedReturnValue: 120, estimatedTime: '4h por turno', difficulty: 'easy' },
  { title: 'Participar de pesquisas pagas online', detail: 'Plataformas como Toluna e Opinion Box pagam por pesquisas. Renda baixa mas sem esforço.', platform: 'Toluna / Opinion Box', estimatedReturn: 'R$ 30–80/mês', estimatedReturnValue: 55, estimatedTime: '30min/dia', difficulty: 'easy' },
  { title: 'Alugar vaga de garagem ou quarto pelo Airbnb', detail: 'Se tiver espaço ocioso, transforme em renda imediata.', platform: 'OLX Autos / Airbnb', estimatedReturn: 'R$ 150–600/mês', estimatedReturnValue: 375, estimatedTime: '1h de setup', difficulty: 'easy' },
];

function buildDebtContext(task: Omit<IncomeTask, 'id' | 'category' | 'debtContext'>, topDebt: Debt | null): string | undefined {
  if (!topDebt) return undefined;
  const value = task.estimatedReturnValue;
  const payment = topDebt.monthlyPayment || 0;
  if (payment <= 0) return undefined;
  const pct = Math.round((value / payment) * 100);
  if (pct >= 100) return `Cobriria a parcela completa do ${topDebt.creditor} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment)})`;
  if (pct >= 50) return `Cobriria ${pct}% da parcela do ${topDebt.creditor}`;
  const interest = topDebt.interestRateMonthly;
  if (interest > 0.1) return `Reduziria juros futuros do ${topDebt.creditor} (${(interest * 100).toFixed(0)}% a.m.)`;
  return undefined;
}

export function generateIncomeTaskSuggestions(
  skills: string[],
  debts: Debt[],
  goals: Goal[],
): IncomeTask[] {
  const topDebt = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly)[0] || null;

  const tasks: IncomeTask[] = [];
  const seen = new Set<string>();

  // Skill-based tasks first
  for (const skill of skills) {
    const matches = SKILL_TASKS[skill] || [];
    for (const t of matches) {
      const id = `${skill}-${t.title}`.replace(/\s/g, '-').toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      tasks.push({
        ...t,
        id,
        category: 'renda_extra',
        debtContext: buildDebtContext(t, topDebt),
      });
    }
  }

  // Universal tasks (limit 2)
  let universalAdded = 0;
  for (const t of UNIVERSAL_TASKS) {
    if (universalAdded >= 2) break;
    const id = t.title.replace(/\s/g, '-').toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    tasks.push({
      ...t,
      id,
      category: 'renda_extra',
      debtContext: buildDebtContext(t, topDebt),
    });
    universalAdded++;
  }

  // Sort: highest estimated return first, contextualized tasks first
  return tasks.sort((a, b) => {
    const aCtx = a.debtContext ? 1 : 0;
    const bCtx = b.debtContext ? 1 : 0;
    if (aCtx !== bCtx) return bCtx - aCtx;
    return b.estimatedReturnValue - a.estimatedReturnValue;
  });
}
