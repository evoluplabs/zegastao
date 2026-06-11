# Plano de Marketing Completo — Zé Gastão
**60 dias orgânico + estratégia de tráfego pago | Growth Hacker Edition**
*Versão 2.0 — Atualizado com tráfego pago e processos detalhados*

---

## PREMISSAS REAIS

- **CAC orgânico**: R$0 (60 primeiros dias)
- **CAC pago alvo**: R$5 por cadastro / R$50 por pagante
- **Tempo disponível**: ~2h/dia para marketing (resto é Claude Code)
- **Budget ads inicial**: R$0 → reinveste 30% do MRR quando MRR > R$300
- **Meta 60 dias**: 500 cadastros, 35-40 pagantes, MRR ~R$700-800
- **Meta 6 meses**: 3.000 usuários, 200 pagantes, MRR ~R$4.000

---

## SETUP TÉCNICO OBRIGATÓRIO (Dias 0-3)

### Tracking e Analytics
```bash
# 1. Ativar Mixpanel
firebase hosting:config:set VITE_MIXPANEL_TOKEN=SEU_TOKEN

# 2. Google Search Console
# Verificar domínio zegastao.com.br → adicionar TXT no DNS

# 3. Google Analytics 4
# Criar propriedade → adicionar GA4 tag no index.html
```

### SEO Fundação
- ✅ robots.txt configurado (`public/robots.txt`)
- ✅ sitemap.xml gerado (`public/sitemap.xml`)
- ✅ Meta tags OG/Twitter no `index.html`
- ✅ 47 posts de blog com URLs semânticas
- ⚠️ Verificar Google Search Console semanalmente

### Pixel Meta (para retargeting futuro)
```html
<!-- Adicionar no index.html quando começar ads -->
<script>
  !function(f,b,e,v,n,t,s){...}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'SEU_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

---

## FASE 1 — DIAS 1-14: FUNDAÇÃO E REDE PESSOAL

**Meta**: 50-80 usuários | 0-2 pagantes

### Blog (prioridade SEO)
Publicar 10 posts nas primeiras 2 semanas. Prioridade:
1. "Como sair do vermelho em 12 meses ganhando salário mínimo"
2. "Por que 12% ao mês no cartão te destrói em 12 meses"
3. "Regra 50-30-20 adaptada para a realidade do Brasil"
4. "10 bicos reais para fazer no fim de semana"
5. "Delivery toda semana: quanto custa por ano"

### Rede Pessoal (WhatsApp)
**Script testado** (copie e personalize):
> "Ei [nome]! Criei um app de finanças chamado Zé Gastão. Ajuda quem tem dívida ou quer organizar o dinheiro — é gratuito pra começar. Testa e me fala o que achou? [link com UTM] Se gostar, me manda um print — fico feliz de saber que ajudou de verdade."

- Enviar para 50 contatos pessoais (família, amigos, ex-colegas)
- Meta: 20 cadastros da rede pessoal

### Grupos WhatsApp
Entrar ou criar 3 grupos temáticos:
- "Finanças para o Povo BR" (criar)
- "Sair das Dívidas 2025" (criar)
- "Renda Extra SP" (buscar ou criar)

**Regra de ouro**: dar valor ANTES de mencionar o app. Postar 3 dicas genuínas antes de qualquer divulgação.

### Instagram/TikTok (começo simples)
**Formato**: selfie + narração, 30-60s, sem edição cara, vertical

**Semana 1**:
> "Calculei quanto pago de juros no cartão por ano. O número me assustou — assiste até o fim [mostra tela do app]"

**Semana 2**:
> "Importei meu extrato no Zé Gastão. Descobri que gasto R$400/mês em delivery sem perceber. Olha o que a IA encontrou..."

**Frequência**: 3 posts/semana (Terça, Quinta, Sábado)

---

## FASE 2 — DIAS 15-30: VALIDAÇÃO E PRIMEIROS PAGANTES

**Meta**: 150-200 usuários | 5-8 pagantes

### SEO e Conteúdo
- Publicar mais 15 posts (total 25)
- Foco: calculadoras interativas e histórias reais
- Google Search Console: identificar primeiros termos e otimizar

### Facebook Grupos (alto potencial)
Entrar em:
- "Finanças Pessoais Brasil" (200k+ membros)
- "Livre das Dívidas" (50k+ membros)
- "Empreendedorismo e Finanças BR" (100k+ membros)

**Estratégia**:
1. Semana 1: apenas responder perguntas com valor (sem link)
2. Semana 2: responder uma pergunta e mencionar naturalmente o app
3. Nunca postar link diretamente → responder DM

### Microinfluenciadores (custo zero)
Busca: Instagram/TikTok, 1k-20k seguidores, tema: dívidas/finanças/renda extra

**DM script**:
> "Oi [nome]! Vi seu conteúdo sobre [tema específico] — muito bom mesmo. Criei um app chamado Zé Gastão para ajudar quem tem dívidas. Você topa testar 3 meses grátis do plano pago e, se gostar, contar pra sua audiência? Sem contrato, sem script, sem obrigação. O que acha?"

Meta: 5 microinfluenciadores ativados

### Conversão Free → Paid
- Usuários com 14+ dias sem assinar → email/DM: "Você já usou X vezes. Quer desbloquear análises ilimitadas?"
- A/B test: CTA "Assinar" vs "Desbloquear Copiloto"

---

## FASE 3 — DIAS 31-45: ESCALA ORGÂNICA

**Meta**: 300 usuários | 15-20 pagantes

### Desafio Viral
Lançar "Desafio 30 dias sem dívida nova" no Instagram:
- Hashtag: #ZeGastaoDesafio
- Template de storie compartilhável
- Regra: compartilhe seu progresso e marque @zegastao
- Criar template no Canva (1080×1920px)

### PR e Mídia (email frio)
Lista de contatos:
- Repórteres UOL Economia, G1 Economia (buscar no LinkedIn)
- Podcasts: Me Poupe!, Mamilos, Primo Pobre (DM no Instagram)
- Jornalistas fintech: Exame, Valor Econômico, Estadão

**Pitch de 50 palavras**:
> "Olá [nome], sou [você], criador do Zé Gastão — app de finanças focado no brasileiro que ganha até 3 salários mínimos. Em [X] semanas temos [Y] usuários, [Z%] saíram da fase Sobrevivência. Posso te conectar com um usuário real da Zona Leste para contar a história?"

### Blog: Pillar Page
Criar "Guia Completo para Sair das Dívidas em 2025" (3.000+ palavras):
- Linka todos os posts da categoria Dívidas
- Target keyword: "como sair das dívidas"
- Estrutura: diagnóstico → plano → ferramentas → histórias reais

---

## FASE 4 — DIAS 46-60: CONVERSÃO E PITCH

**Meta**: 400-500 usuários | 25-40 pagantes

### Sequência de Email (nurture)
Implementar via Firebase Functions + SendGrid/Brevo (free até 9k emails/mês):

| Dia | Assunto | Conteúdo |
|-----|---------|----------|
| D+1 | "Bem-vindo! Seu primeiro passo" | Tour do app + CTA: importar extrato |
| D+7 | "Você importou seu extrato?" | Benefícios do upload + como funciona a IA |
| D+21 | "Você economizou R$X este mês" | Dados reais do usuário + upgrade prompt |
| D+30 | "Oferta especial desta semana" | 1 mês por R$9,90 (oferta limitada) |

### Re-engajamento (usuários inativos 20+ dias)
Push notification + email: "Seu diagnóstico financeiro mudou — veja o que aconteceu com suas finanças neste mês"

### Aceleradoras e Investimento
Inscrever quando tiver métricas (após 60 dias):
- InovAtiva Brasil (gratuito, governo federal): inovativa.startupbrasil.org.br
- Cubo Itaú (fintech): cubo.network/startups
- WOW Acelera (impacto social): wow.org.br
- Distrito Fintech: distrito.me/fintech

---

## ESTRATÉGIA DE TRÁFEGO PAGO

### Quando Ativar
**Gatilho**: MRR > R$300/mês (~15 pagantes)
**Investimento inicial**: R$15/dia (R$450/mês)
**Meta de ROAS**: 3× (R$1.350 em receita para R$450 investido)

### Meta Ads (Facebook/Instagram)

**Estrutura de Campanha**:
```
Campanha: ZeGastao_Aquisicao
├── Ad Set 1: Lookalike 1% dos pagantes
│   └── Criativos: Reels 15s (melhor organic reutilizado)
├── Ad Set 2: Interesse: "Finanças pessoais" + "Endividamento" + 25-45 anos
│   └── Criativos: Carrossel com screenshots do app
└── Ad Set 3: Retargeting visitantes /pricing (últimos 30 dias)
    └── Criativos: Depoimento + prova social
```

**Públicos que funcionam para fintech popular**:
- Interesses: serasa, endividamento, renda extra, cartão de crédito, nubank, caixa econômica
- Comportamento: usuários de apps de banco digital
- Geográfico: Brasil, foco em SP e RJ capital para começar
- Demo: 25-45 anos, todos os gêneros

**Criativos testados para esse público**:
- 🏆 **Melhor para BR popular**: "Descobri quanto pago de juros por mês [número chocante]"
- 🔥 **2º melhor**: Antes/Depois da organização financeira (screenshot real)
- ✅ **3º**: Depoimento em texto + foto (não precisar de vídeo)

### Google Ads (a partir de R$500 MRR)

**Palavras-chave principais** (alto intent, baixa concorrência):
- "como sair das dívidas gratis" (CPC ~R$0,80)
- "app controle financeiro gratuito" (CPC ~R$1,20)
- "calcular tempo pagar dívidas" (CPC ~R$0,60)
- "importar extrato bancário app" (CPC ~R$0,90)

**Landing page dedicada**: `/campanha/google` — copy direto para pesquisa, sem menu de navegação, CTA único "Começar grátis agora"

### Funil Completo

```
Blog SEO (gratuito)
        ↓
   Visita ao blog
        ↓
   CTA no post → Cadastro
        ↓
Pixel dispara → Audiência retargeting
        ↓
   Ad de retargeting → Upgrade
        ↓
          Pagante
```

### Meta Ads Criativos — Roteiro Pronto

**Criativo 1 — "A conta chocante"** (15s):
> [tela do app] "Calculei quanto tô pagando de juros por ano. Olha o número... [pausa] R$4.800. Pra uma dívida de R$12.000. O Zé Gastão calculou isso em 30 segundos. É gratuito. Link na bio."

**Criativo 2 — "O extrato"** (30s):
> "Importei meu extrato e o app me mostrou que gasto R$650/mês em coisa que nem lembro de comprar. Em 30 dias cortei R$200. Sem planilha, sem neura. Só importei o PDF do banco."

**Criativo 3 — Carrossel** (imagens estáticas):
- Slide 1: "Quanto você REALMENTE paga no cartão?"
- Slide 2: Gráfico de juros compostos (dado real)
- Slide 3: Screenshot da tela do app
- Slide 4: CTA "Calcule grátis → zegastao.com.br"

---

## MÉTRICAS PARA ACOMPANHAR

### Dashboard Semanal (Mixpanel + Firestore)

| Métrica | Semana 1 | Semana 4 | Semana 8 | Meta |
|---------|----------|----------|----------|------|
| Cadastros acumulados | 30 | 200 | 500 | 500 |
| Pagantes | 0 | 8 | 35 | 35-40 |
| MRR | R$0 | R$160 | R$700 | R$700+ |
| CAC pago (quando ativo) | — | — | R$50 | < R$50 |
| DAU/MAU ratio | — | 20% | 30% | > 25% |
| Conv. free→paid | — | 4% | 7% | > 5% |

### Métricas de Produto (semanais)
- % usuários que importaram extrato no 1º dia
- % usuários que fizeram ≥3 perguntas ao copilot (engajamento real)
- NPS proxy: % que compartilhou conquista

### Métricas de Conteúdo
- Posts de blog indexados (Google Search Console)
- Posts com CTR > 5%
- Visitantes do blog que converteram em cadastro

---

## CRONOGRAMA EXECUTÁVEL

| Semana | Foco Principal | Meta Usuários | Meta Pagantes | Budget Ads |
|--------|----------------|---------------|---------------|------------|
| S1 | Setup técnico + rede pessoal + 5 posts | 30 | 0 | R$0 |
| S2 | Instagram/TikTok + 5 posts + grupos WhatsApp | 80 | 2 | R$0 |
| S3 | Microinfluenciadores + 7 posts + referral ativo | 130 | 5 | R$0 |
| S4 | B2B 1ª empresa + 8 posts + Facebook grupos | 200 | 8 | R$0 |
| S5 | Desafio 30 dias + PR frio + 5 posts | 280 | 14 | R$0 |
| S6 | Escala conteúdo + pillar page + A/B CTA | 350 | 20 | R$0 |
| S7 | Email nurture + push re-engage + 1ºs ads (se MRR>R$300) | 420 | 28 | R$150 |
| S8 | Deck investidor + aceleradoras + oferta especial | 500 | 35-40 | R$300 |

---

## B2B — MÓDULO EMPRESAS

### Pitch para RH de Pequenas Empresas
**Proposta**: Benefício de saúde financeira para colaboradores

**Script por WhatsApp**:
> "Oi [nome]! Sou [você], criador do Zé Gastão. A gente ajuda colaboradores a organizar as finanças, sair das dívidas e aumentar a produtividade. Empresas que oferecem isso como benefício veem menos faltas por estresse financeiro. Posso mostrar como funciona em 10 minutos? Não tem custo de implantação."

**Empresas para prospectar (Zona Leste SP)**:
- Mecânicas e oficinas (15-50 funcionários)
- Padarias e confeitarias com equipe
- Salões de beleza com funcionários CLT
- Escolas particulares de bairro
- APAE e organizações sociais locais

**Preço B2B**: R$15/funcionário/mês (25% desconto vs individual)

---

## STORIES NO INSTAGRAM PESSOAL

Se quiser usar sua conta pessoal para amplificar:

**Template de story** (1-2x por semana):
1. Primeiro frame: "Trabalhando numa coisa..." (curiosidade)
2. Segundo frame: Screenshot do painel admin com dados reais (ex: "X usuários hoje")
3. Terceiro frame: "Quem usar hoje, me conta?" + link do Zé Gastão

**IMPORTANTE**: Stories pessoais geram muito mais confiança que conta empresarial. O público vê a pessoa por trás do produto.

---

## CHECKLIST SEMANAL DE MARKETING

```markdown
### Semana [X] — Zé Gastão Marketing

**CONTEÚDO**
- [ ] 1 post de blog publicado (com sitemap atualizado)
- [ ] 3 posts Instagram/TikTok publicados (Ter, Qui, Sab)
- [ ] 1 story pessoal sobre o projeto

**COMUNIDADE**
- [ ] 5 respostas em grupos Facebook/WhatsApp com valor real
- [ ] 1 DM para microinfluenciador em potencial
- [ ] Responder todos os comentários/DMs do @zegastao

**DADOS**
- [ ] Verificar cadastros novos esta semana
- [ ] Abrir Google Search Console: novos posts indexados?
- [ ] Mixpanel: funil de conversão — onde estão abandonando?

**B2B**
- [ ] 1 contato com empresa local (email/WhatsApp)
- [ ] Follow-up em leads B2B do painel admin

**TECH**
- [ ] Firebase Functions sem erros?
- [ ] Algum bug reportado por usuário?
```

---

*Documento criado e mantido com Claude Code.*
*Revisar e atualizar mensalmente com dados reais.*
