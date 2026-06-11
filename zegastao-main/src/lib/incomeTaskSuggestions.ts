// Gerador de sugestões de renda extra local (sem API).
// Usa habilidades do usuário + situação de dívidas para criar tarefas específicas e acionáveis.

import { formatPct } from '@/lib/utils';
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
  'Costura e alfaiataria': [
    { title: 'Ajustes e consertos de roupa', detail: 'Barras, zíperes, ajuste de tamanho. Baixo custo, alta frequência.', platform: 'Boca a boca / OLX', estimatedReturn: 'R$ 20–80 por peça', estimatedReturnValue: 50, estimatedTime: '30min–1h', difficulty: 'easy', skillRequired: 'Costura e alfaiataria' },
    { title: 'Customização de roupas e peças únicas', detail: 'Venda peças customizadas no Instagram ou Elo7. Margem alta em nichos de moda.', platform: 'Instagram / Elo7', estimatedReturn: 'R$ 80–300 por peça', estimatedReturnValue: 190, estimatedTime: '2–4h', difficulty: 'medium', skillRequired: 'Costura e alfaiataria' },
  ],
  'Beleza': [
    { title: 'Fazer sobrancelha/depilação em domicílio', detail: 'Atendimento a domicílio cobra 30–50% mais que salão. Alta recorrência.', platform: 'WhatsApp / Instagram', estimatedReturn: 'R$ 40–100 por cliente', estimatedReturnValue: 70, estimatedTime: '30–45min', difficulty: 'easy', skillRequired: 'Beleza' },
    { title: 'Manicure/pedicure em domicílio', detail: 'Crie agenda fixos para fins de semana. 3 clientes já pagam uma parcela.', platform: 'WhatsApp / boca a boca', estimatedReturn: 'R$ 50–120 por cliente', estimatedReturnValue: 85, estimatedTime: '1h por cliente', difficulty: 'easy', skillRequired: 'Beleza' },
  ],
  'Beleza (cabelo/unhas/maquiagem)': [
    { title: 'Atendimento de beleza em domicílio', detail: 'Sobrancelha, unhas, maquiagem. Atendimento em casa cobra 30–50% mais que salão.', platform: 'WhatsApp / Instagram', estimatedReturn: 'R$ 40–150 por cliente', estimatedReturnValue: 95, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Beleza (cabelo/unhas/maquiagem)' },
    { title: 'Pacote noiva/formanda: maquiagem + penteado', detail: 'Datas comemorativas têm demanda alta. Um pacote em fim de semana cobre uma parcela.', platform: 'Instagram / indicações', estimatedReturn: 'R$ 300–800 por pacote', estimatedReturnValue: 550, estimatedTime: '3–5h', difficulty: 'medium', skillRequired: 'Beleza (cabelo/unhas/maquiagem)' },
  ],
  'Design gráfico': [
    { title: 'Criar artes para redes sociais (pacote mensal)', detail: 'Pequenos negócios precisam de posts semanais. Ofereça pacote de 8 posts por mês.', platform: 'Instagram / GetNinjas', estimatedReturn: 'R$ 250–600', estimatedReturnValue: 425, estimatedTime: '4–6h/mês', difficulty: 'easy', skillRequired: 'Design gráfico' },
    { title: 'Logo e identidade visual para MEI', detail: 'MEIs em fase inicial precisam de logo. Entregue em 48h com 2 variações.', platform: '99designs / direto', estimatedReturn: 'R$ 150–400', estimatedReturnValue: 275, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Design gráfico' },
  ],
  'Criação de conteúdo': [
    { title: 'Produzir conteúdo mensal para negócio local', detail: 'Crie roteiros, posts e stories para empresas que não têm tempo. Cobre mensalidade.', platform: 'Instagram / direto', estimatedReturn: 'R$ 400–900/mês', estimatedReturnValue: 650, estimatedTime: '6–10h/mês', difficulty: 'medium', skillRequired: 'Criação de conteúdo' },
    { title: 'Criar e-book ou guia digital para venda', detail: 'Transforme seu conhecimento em produto digital. Venda recorrente sem esforço.', platform: 'Hotmart / Kiwify', estimatedReturn: 'R$ 200–1.000/mês', estimatedReturnValue: 600, estimatedTime: '10–20h de setup', difficulty: 'hard', skillRequired: 'Criação de conteúdo' },
  ],
  'Tráfego pago': [
    { title: 'Gestão de Google Ads/Meta Ads para PME', detail: 'Pequenas empresas precisam de tráfego pago mas não sabem configurar. Cobre mensalidade.', platform: 'LinkedIn / GetNinjas', estimatedReturn: 'R$ 400–900/mês', estimatedReturnValue: 650, estimatedTime: '4–6h setup + 2h/mês', difficulty: 'medium', skillRequired: 'Tráfego pago' },
  ],
  'Marketing digital': [
    { title: 'Gestão de redes sociais para negócio local', detail: 'Pacote mensal: planejamento + criação + publicação 3x por semana.', platform: 'LinkedIn / GetNinjas', estimatedReturn: 'R$ 400–800/mês', estimatedReturnValue: 600, estimatedTime: '5–8h/mês', difficulty: 'easy', skillRequired: 'Marketing digital' },
    { title: 'Consultoria de presença digital para MEI', detail: 'Oriente MEIs sobre como usar o Instagram para vender. Sessão de 2h.', platform: 'LinkedIn / direto', estimatedReturn: 'R$ 150–350 por sessão', estimatedReturnValue: 250, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Marketing digital' },
  ],
  'SEO': [
    { title: 'Auditoria e otimização de SEO local', detail: 'Google Meu Negócio + otimização básica de site para aparecer na busca local.', platform: 'LinkedIn / Workana', estimatedReturn: 'R$ 300–700', estimatedReturnValue: 500, estimatedTime: '3–5h', difficulty: 'medium', skillRequired: 'SEO' },
  ],
  'Gestão de redes sociais': [
    { title: 'Gestão completa de Instagram para empresa', detail: 'Cuide do feed, stories e mensagens de um negócio local. Contrato mensal.', platform: 'LinkedIn / direto', estimatedReturn: 'R$ 500–1.200/mês', estimatedReturnValue: 850, estimatedTime: '8–12h/mês', difficulty: 'medium', skillRequired: 'Gestão de redes sociais' },
  ],
  'Suporte de TI': [
    { title: 'Suporte técnico em domicílio (formatação/vírus)', detail: 'Alta demanda de pessoas e pequenos negócios com problema de computador.', platform: 'GetNinjas / boca a boca', estimatedReturn: 'R$ 80–200 por visita', estimatedReturnValue: 140, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Suporte de TI' },
  ],
  'Coaching': [
    { title: 'Sessão individual de coaching de carreira/vida', detail: 'Ofereça 1 sessão de diagnóstico gratuita e feche pacotes de 4–8 sessões.', platform: 'LinkedIn / Hotmart', estimatedReturn: 'R$ 150–400 por sessão', estimatedReturnValue: 275, estimatedTime: '1–2h por sessão', difficulty: 'medium', skillRequired: 'Coaching' },
  ],
  'Tutoria on-line': [
    { title: 'Tutoria online para concursos e vestibulares', detail: 'Alta demanda em plataformas online. Pacotes de aulas semanais.', platform: 'Superprof / Preply', estimatedReturn: 'R$ 50–100/h', estimatedReturnValue: 75, estimatedTime: '1h/aula', difficulty: 'easy', skillRequired: 'Tutoria on-line' },
  ],
  'Encanamento': [
    { title: 'Pequenos reparos hidráulicos residenciais', detail: 'Torneiras, caixas d\'água, entupimentos. Alta frequência no bairro.', platform: 'GetNinjas / Parafuso / boca a boca', estimatedReturn: 'R$ 80–250 por serviço', estimatedReturnValue: 165, estimatedTime: '1–2h', difficulty: 'easy', skillRequired: 'Encanamento' },
  ],
  'Pintura residencial': [
    { title: 'Pintura de cômodos e acabamentos', detail: 'Repintura de paredes por cômodo. Valor por metro quadrado ou cômodo fechado.', platform: 'GetNinjas / boca a boca', estimatedReturn: 'R$ 200–600 por cômodo', estimatedReturnValue: 400, estimatedTime: '4–8h', difficulty: 'medium', skillRequired: 'Pintura residencial' },
  ],
  'Jardinagem': [
    { title: 'Manutenção de jardim/quintal semanal', detail: 'Clientes fixos semanais garantem renda recorrente. 3–4 clientes já valem o dia.', platform: 'GetNinjas / boca a boca', estimatedReturn: 'R$ 80–200 por visita', estimatedReturnValue: 140, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Jardinagem' },
  ],
  'Limpeza': [
    { title: 'Faxina residencial por diária', detail: 'Alta demanda constante. Plataformas facilitam encontrar clientes rapidamente.', platform: 'GetNinjas / Parafuso', estimatedReturn: 'R$ 120–250 por diária', estimatedReturnValue: 185, estimatedTime: '4–6h', difficulty: 'easy', skillRequired: 'Limpeza' },
  ],
  'Montagem de móveis': [
    { title: 'Montar móveis (entregas IKEA/Madeiranit)', detail: 'Alta demanda em cidades com IKEA ou lojas de flat-pack. Pague por visita.', platform: 'GetNinjas / OLX', estimatedReturn: 'R$ 100–250 por serviço', estimatedReturnValue: 175, estimatedTime: '2–3h', difficulty: 'easy', skillRequired: 'Montagem de móveis' },
  ],
  'Mecânica': [
    { title: 'Revisão e pequenos reparos automotivos', detail: 'Troca de óleo, pastilhas de freio, fluidos. Atendimento no local ou em casa.', platform: 'GetNinjas / boca a boca', estimatedReturn: 'R$ 100–350 por serviço', estimatedReturnValue: 225, estimatedTime: '1–3h', difficulty: 'medium', skillRequired: 'Mecânica' },
  ],
  'Massagem': [
    { title: 'Massagem relaxante em domicílio', detail: 'Leve a mesa de massagem e atenda clientes em casa. Alta margem.', platform: 'WhatsApp / GetNinjas', estimatedReturn: 'R$ 100–250 por sessão', estimatedReturnValue: 175, estimatedTime: '1h por sessão', difficulty: 'easy', skillRequired: 'Massagem' },
  ],
  'Personal trainer': [
    { title: 'Personal trainer presencial (parque ou condomínio)', detail: 'Treine clientes em parques públicos ou condomínios. Mensalidade recorrente.', platform: 'Instagram / boca a boca', estimatedReturn: 'R$ 600–1.500/mês', estimatedReturnValue: 1050, estimatedTime: '3×/semana 1h', difficulty: 'easy', skillRequired: 'Personal trainer' },
    { title: 'Personal trainer online (vídeo-aula)', detail: 'Planos personalizados por mês. Maior escala com menor deslocamento.', platform: 'Instagram / WhatsApp', estimatedReturn: 'R$ 200–600/mês por aluno', estimatedReturnValue: 400, estimatedTime: '2h setup + acompanhamento', difficulty: 'easy', skillRequired: 'Personal trainer' },
  ],
  'Nutrição': [
    { title: 'Consultoria nutricional online', detail: 'Plano alimentar + acompanhamento mensal. Alta demanda por saúde e emagrecimento.', platform: 'WhatsApp / Calendly', estimatedReturn: 'R$ 200–600/pacote', estimatedReturnValue: 400, estimatedTime: '2–3h setup + 30min/semana', difficulty: 'medium', skillRequired: 'Nutrição' },
  ],
  'Cuidado de animais (pet sitter)': [
    { title: 'Pet sitter / hospedagem de animais', detail: 'Cuide de animais enquanto o dono viaja. Alta demanda em feriados.', platform: 'DogHero / boca a boca', estimatedReturn: 'R$ 60–150 por dia', estimatedReturnValue: 105, estimatedTime: 'Tempo livre', difficulty: 'easy', skillRequired: 'Cuidado de animais (pet sitter)' },
  ],
  'Assistente virtual': [
    { title: 'Assistência virtual para empreendedor', detail: 'E-mails, agendamentos, pesquisas, planilhas. Contrato mensal de horas.', platform: 'Workana / LinkedIn', estimatedReturn: 'R$ 400–900/mês', estimatedReturnValue: 650, estimatedTime: '20–40h/mês', difficulty: 'easy', skillRequired: 'Assistente virtual' },
  ],
  'Consultoria financeira': [
    { title: 'Organização financeira pessoal para clientes', detail: 'Monte o planejamento financeiro de outra pessoa — planilha + sessão de orientação.', platform: 'LinkedIn / indicações', estimatedReturn: 'R$ 200–500 por cliente', estimatedReturnValue: 350, estimatedTime: '3–5h', difficulty: 'medium', skillRequired: 'Consultoria financeira' },
  ],
  'Consultoria empresarial': [
    { title: 'Diagnóstico e plano de ação para MEI/ME', detail: 'Identifique gargalos e monte um plano simples. Cobrado por projeto.', platform: 'LinkedIn / Sebrae', estimatedReturn: 'R$ 500–1.500', estimatedReturnValue: 1000, estimatedTime: '8–15h', difficulty: 'hard', skillRequired: 'Consultoria empresarial' },
  ],
  'Logística / entregas': [
    { title: 'Entregas com carro/moto em plataforma', detail: 'iFood, Rappi, Lalamove. 1 turno por semana já gera renda complementar relevante.', platform: 'iFood / Rappi / Lalamove', estimatedReturn: 'R$ 100–250/turno', estimatedReturnValue: 175, estimatedTime: '4–6h por turno', difficulty: 'easy', skillRequired: 'Logística / entregas' },
  ],
  'Culinária (marmitas / confeitaria)': [
    { title: 'Vender marmitas saudáveis na vizinhança', detail: 'Foco em 10–20 clientes fixos. Entrega semanal. Baixo custo de entrada.', platform: 'WhatsApp / Canais vizinhança', estimatedReturn: 'R$ 400–1.200/mês', estimatedReturnValue: 800, estimatedTime: '4–6h/semana', difficulty: 'medium', skillRequired: 'Culinária (marmitas / confeitaria)' },
    { title: 'Bolos e doces por encomenda', detail: 'Confeitaria sob encomenda com entrega local. Alta margem em datas festivas.', platform: 'Instagram / WhatsApp', estimatedReturn: 'R$ 100–400 por encomenda', estimatedReturnValue: 250, estimatedTime: '3–5h', difficulty: 'easy', skillRequired: 'Culinária (marmitas / confeitaria)' },
  ],
  'Bartender / garçom': [
    { title: 'Trabalho em eventos e festas particulares', detail: 'Bares temporários em festas corporativas e casamentos. Alta diária.', platform: 'Plataformas de eventos / boca a boca', estimatedReturn: 'R$ 200–500 por evento', estimatedReturnValue: 350, estimatedTime: '6–8h por evento', difficulty: 'easy', skillRequired: 'Bartender / garçom' },
  ],
  'Organização de eventos': [
    { title: 'Coordenar festa de aniversário ou confraternização', detail: 'Pequenos eventos de 20–50 pessoas. Cobre fornecedores, decoração e logística.', platform: 'Instagram / indicações', estimatedReturn: 'R$ 500–1.500', estimatedReturnValue: 1000, estimatedTime: '10–20h', difficulty: 'medium', skillRequired: 'Organização de eventos' },
  ],
  'Artesanato': [
    { title: 'Vender produtos artesanais no Elo7', detail: 'Bijuterias, quadros, decoração. Plataforma consolidada com público segmentado.', platform: 'Elo7 / Instagram', estimatedReturn: 'R$ 100–500/mês', estimatedReturnValue: 300, estimatedTime: 'Variável', difficulty: 'easy', skillRequired: 'Artesanato' },
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
  if (interest > 0.1) return `Reduziria juros futuros do ${topDebt.creditor} (${formatPct(interest * 100)} a.m.)`;
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
