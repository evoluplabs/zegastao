# Zé Gastão — Documentação do Projeto

> **O copiloto financeiro e de apostas mais honesto que você vai encontrar.**
> Feito para brasileiros que querem entender de verdade para onde vai o dinheiro — e, se forem apostar, fazer isso com inteligência.

---

## Índice

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Arquitetura macro](#2-arquitetura-macro)
3. [Módulo 1 — Zé Gastão (finanças pessoais)](#3-módulo-1--zé-gastão-finanças-pessoais)
4. [Módulo 2 — Zé Apostador](#4-módulo-2--zé-apostador)
5. [Coerência financeira — como os dados conversam](#5-coerência-financeira--como-os-dados-conversam)
6. [Pipeline de extração de extratos](#6-pipeline-de-extração-de-extratos)
7. [Cloud Functions — o que roda no servidor](#7-cloud-functions--o-que-roda-no-servidor)
8. [Modelo de dados (Firestore)](#8-modelo-de-dados-firestore)
9. [Stack técnica](#9-stack-técnica)
10. [Feature flags e ambientes](#10-feature-flags-e-ambientes)
11. [Como desenvolver localmente](#11-como-desenvolver-localmente)

---

## 1. Visão geral do produto

O Zé Gastão é um **app de finanças pessoais com IA** que tem dois módulos principais:

| Módulo | O que faz |
|---|---|
| **Zé Gastão** | Organiza renda, despesas, dívidas, metas, cofrinho e gera insights diários sobre a vida financeira do usuário |
| **Zé Apostador** | Motor determinístico de análise de apostas esportivas (Poisson + Elo + Kelly), com extração de odds por foto da tela da Betano |

**Princípio central de ambos:** nenhum número sai de uma IA sem respaldo matemático ou dado real. A IA redige, explica e pesquisa — os cálculos são determinísticos e auditáveis.

---

## 2. Arquitetura macro

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (browser/mobile)                  │
│                  React 18 + TypeScript + Vite                │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  Zé Gastão   │  │  Zé Apostador  │  │   Landing Page  │  │
│  │  (finanças)  │  │  (apostas)     │  │   (marketing)   │  │
│  └──────┬───────┘  └───────┬────────┘  └─────────────────┘  │
│         │                  │                                  │
│  Zustand store  ←→  Firebase SDK (Auth + Firestore)          │
└─────────┼──────────────────┼──────────────────────────────── ┘
          │ HTTPS calls       │ HTTPS calls
          ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│           Firebase Cloud Functions (Node 20 · southamerica) │
│                                                              │
│  onStatementUpload  │  nightlyDigest  │  zeMandate/zeCycle  │
│  copilotChat        │  processDigest  │  zeExtractOdds      │
│  generateInsights   │  zeLearnNightly │  zeGuruAudit        │
└──────────┬──────────────────┬─────────────────┬─────────────┘
           │                  │                 │
     ┌─────▼─────┐    ┌───────▼──────┐  ┌──────▼───────────┐
     │ Firestore │    │ Claude API   │  │  API-Football    │
     │ (dados)   │    │ (IA/insights)│  │  The Odds API    │
     └───────────┘    └──────────────┘  └──────────────────┘
```

---

## 3. Módulo 1 — Zé Gastão (finanças pessoais)

### 3.1 Onboarding e perfil financeiro

Quando o usuário se cadastra, passa por um **wizard de configuração** que coleta:

- **Renda mensal** (salário + outras fontes)
- **Despesas fixas** (aluguel, planos, assinaturas)
- **Dívidas** (nome do credor, valor total, parcela, taxa de juros)
- **Metas** (reserva de emergência, viagem, imóvel, etc.)
- **Contas bancárias** (saldo atual + data da reconciliação)

Esses dados vão para o Firestore na coleção `users/{uid}/profile/main` e formam o **contexto financeiro** que alimenta todos os cálculos e a IA.

### 3.2 Dashboard — o painel central

O Dashboard é o reflexo da vida financeira do usuário em tempo real. Ele calcula:

| Indicador | De onde vem |
|---|---|
| **Patrimônio** | Soma dos saldos de todas as contas via `computeBalance()` |
| **Entradas do mês** | Transações com `amount > 0` e categorias não neutras |
| **Saídas do mês** | Transações com `amount < 0` e categorias não neutras |
| **Resultado** | Entradas − Saídas |

**Navegação de meses:** o usuário pode navegar entre meses (◀/▶) e ver como estavam as finanças em qualquer período histórico. O cálculo é sempre feito com os dados reais — nunca com estimativas.

**Categorias neutras** são excluídas de entradas e saídas porque são movimentações internas que não geram riqueza nem despesa real:

```
Fatura cartão · Transferência · Pagamento fatura · Investimentos
```

### 3.3 Importação de extratos

O usuário pode fazer upload de PDFs de extratos bancários e faturas de cartão. O sistema processa em cascata:

```
PDF enviado
    │
    ▼
Tier 0 — Palavras-chave
    → 80% das transações são categorizadas sem IA (ex: "UBER" → Transporte)
    │
    ▼ (somente transações não reconhecidas)
Tier 1 — Cache de padrões do usuário
    → Fuzzy match com categorias que o próprio usuário já corrigiu antes
    │
    ▼ (somente transações ainda sem categoria)
Tier 2 — Claude Haiku (IA mais rápida e barata)
    → Categoriza o restante em linguagem natural
    │
    ▼
Regras do usuário (ex: "se descrição contém 'Mercado X', marca como Alimentação")
    │
    ▼
Transações gravadas no Firestore
```

**Custo de IA tende a zero** para usuários recorrentes, porque o cache de padrões cresce com o uso.

### 3.4 Contas bancárias e saldo dinâmico

O saldo de uma conta **não é um número estático**. Ele é calculado dinamicamente:

```
saldo_real = saldo_âncora + Σ(transações vinculadas desde a data da âncora)
```

- **Saldo âncora** (`account.balance`): o saldo exato que o usuário informou manualmente na última vez que conferiu o extrato
- **Data da âncora** (`account.balancedAt`): quando esse saldo foi registrado
- **Transações vinculadas** (`transaction.accountId`): transações que o usuário associou a essa conta ao lançar

Quando o usuário lança uma transação e escolhe de qual conta ela saiu, o saldo da conta é atualizado automaticamente no próximo cálculo.

### 3.5 Dívidas e amortização

O sistema gerencia dívidas com:

- **Priorização automática** pelo método Avalanche (maior juros primeiro)
- **Agenda de amortização** nos modelos Price e SAC
- **Negociação**: scripts prontos por tipo de credor (banco, cartão, financeira) com argumentos e porcentagens históricas de desconto
- **Alertas de vencimento** e comparador de cenários "pagar mínimo vs. quitação"

### 3.6 Cofrinho (Caixinha)

Um cofrinho é uma meta de poupança com prazo e valor-alvo. O sistema calcula automaticamente o quanto poupar por dia ou por semana:

```
Meta: R$ 3.000 em 6 meses (180 dias)
Já guardado: R$ 450

Restante: R$ 2.550
Dias restantes: 147

Meta diária:  R$ 2.550 / 147  = R$ 17,35/dia
Meta semanal: R$ 17,35 × 7   = R$ 121,45/semana
```

O usuário escolhe frequência **diária** ou **semanal**. O sistema mostra o streak de dias consecutivos com depósito e avisa quando está em dia ou atrasado. O modo casal permite um cofrinho **compartilhado**: ambos os parceiros podem depositar e ver o progresso em conjunto.

### 3.7 Insights diários (Digestão noturna)

Todo dia, um scheduler chama a função `nightlyDigest`, que dispara uma **fila de tarefas** (Cloud Tasks), uma por usuário. Cada usuário recebe:

1. **Fase financeira** recalculada (ver abaixo)
2. **Insights** personalizados (ex: "Você gastou 40% mais em Alimentação este mês")
3. **Tarefas do dia** (ex: "Você tem R$ 200 de renda extra disponível — considere aplicar")
4. **Marcos** (achievements) desbloqueados
5. **Notificação push** com o resumo

**Fases financeiras** (calculadas pelo `phase-engine.ts`):

| Fase | Significado |
|---|---|
| `survival` | Gastos maiores que renda; dívidas em atraso |
| `reorganizing` | Controlando gastos, mas ainda no vermelho |
| `stabilizing` | Equilibrado, sem reserva de emergência ainda |
| `accumulating` | Com reserva, acumulando patrimônio |
| `growing` | Investindo e crescendo consistentemente |

A fase é usada em todo o app: muda os conselhos da IA, o tom das mensagens, os limites do Zé Apostador e a prioridade das tarefas sugeridas.

### 3.8 Copiloto (chat com IA)

O Copiloto é um chat com Claude que tem acesso ao **contexto financeiro comprimido** do usuário (fase, dívidas, metas, histórico de gastos). Ele:

- Responde perguntas sobre a situação financeira real
- Detecta "impulsos" (ex: "quero comprar um celular novo") e lança um desafio de 48h antes de autorizar
- Sugere renegociação, investimento, renda extra — sempre com base nos dados reais

**Segurança:** a chave da API Claude fica apenas no servidor (Cloud Functions), nunca no frontend.

### 3.9 Modo casal

Dois usuários podem vincular suas contas via email. Depois do vínculo:

- O Dashboard mostra as finanças **combinadas** (toggle on/off)
- A tela de Transações mostra os lançamentos dos dois, identificados por nome
- Os caixinhas podem ser compartilhados
- A IA analisa a situação **do casal** no Copiloto

### 3.10 Imposto de Renda

A função `extractTaxData` varre as transações e contas do usuário e monta automaticamente um rascunho das informações relevantes para a declaração de IR (rendimentos, deduções, investimentos), sem precisar que o usuário preencha nada manualmente.

---

## 4. Módulo 2 — Zé Apostador

> **Disponível atrás da flag `VITE_FEATURE_ZE_APOSTADOR`.**
> Só aparece para usuários com essa variável ativa. Nunca é exibido por padrão.

### 4.1 Filosofia do módulo

O Zé Apostador **não promete ganhos**. Ele analisa apostas com a mesma seriedade com que um analista de risco avaliaria qualquer investimento: calcula a probabilidade real, compara com a odd da casa, detecta se há valor positivo (EV > 0), e só então sugere uma stake proporcional ao Kelly.

Três princípios inegociáveis:
1. **Nenhum número sai de IA:** odds vêm do print da Betano (dado real), probabilidades vêm do motor matemático (Poisson/Elo), a IA só redige e pesquisa.
2. **Jogo responsável como feature:** a fase financeira do usuário limita as apostas; fases frágeis bloqueiam o módulo.
3. **Honestidade radical:** o card sempre mostra a margem da casa, a probabilidade real vs. a implícita, e avisa quando a confiança é baixa.

### 4.2 Mandato (configuração do ciclo)

Antes de apostar, o usuário configura seu **mandato**:

- **Orçamento do ciclo**: quanto quer arriscar no mês (sugerido automaticamente com base na fase financeira e fatura do cartão)
- **Meta**: quanto quer chegar (em R$ ou %)
- **Nível de risco**: conservador, moderado ou agressivo
- **Mercados preferidos**: gols, escanteios, cartões, etc.
- **Disclaimer**: confirmação de que entende as regras e os riscos

O mandato é gravado em `users/{uid}/betting_mandate/main` e define os limites de todo o ciclo.

### 4.3 Ciclo de apostas

Um **ciclo** é a unidade operacional do Zé Apostador. Funciona assim:

```
Usuário inicia ciclo
    │
    ▼
Usuário fotografa a tela da Betano (print do jogo)
    │
    ▼
zeExtractOdds — extrai mercados e odds do print
    │
    ▼
Pipeline determinístico:
  1. Fixtures — identifica o jogo
  2. StatsAgent — médias de gols, escanteios, cartões dos times
  3. Motor Poisson/Elo — calcula λ e probabilidades reais
  4. De-vig — remove a margem da casa das odds
  5. ValueEngine — compara probabilidade real vs. implícita
  6. Kelly — calcula a stake ótima
    │
    ▼
Card guiado — exibido para o usuário com:
  · Mercado sugerido · Seleção · Odd da Betano
  · Probabilidade real (nosso modelo) vs. implícita (odd)
  · EV (valor esperado) · Stake recomendada · Nível de confiança
    │
    ▼
Usuário registra resultado (ganhou / perdeu / void)
    │
    ▼
zeFeedback — atualiza calibração individual + global
```

### 4.4 Extração de odds — print-first

O usuário **fotografa a tela da Betano** em vez de digitar os dados. Isso resolve dois problemas: cobre jogos que as APIs não têm (como a Copa do Mundo) e captura a odd exata que a casa está oferecendo naquele momento.

A extração é em cascata:

```
Print enviado (base64)
    │
    ▼
Pré-processamento (imagePrep.ts)
    → grayscale + corte de margens + redimensionar para ≤ 1024px
    → reduz ~5MB para ~45KB sem perder legibilidade
    │
    ▼
Tier 1 — OCR grátis (tesseract.js)
    → Tenta ler texto da imagem pré-processada
    → Valida: odd é número em faixa plausível? Mercado é reconhecido?
    → Se sim: custo de IA = R$ 0
    │
    ▼ (somente se OCR falhar ou reprovar validação)
Tier 2 — Claude Vision (zeExtractOdds)
    → Modelo multimodal lê a imagem e retorna JSON estruturado
    → { home, away, league, kickoff, markets: [{market, selection, odd}] }
```

**Waze das Odds:** se dois usuários fotografarem o mesmo jogo no mesmo dia, o segundo recebe a extração do primeiro com um aviso "Fulano viu faz X min · odd @1.85 — confirma aí?" em vez de gastar tokens novamente.

### 4.5 Motor matemático (100% determinístico)

#### Poisson + Elo

```
Para cada time:
  λ_ataque = média de gols marcados nos últimos N jogos
  λ_defesa = média de gols sofridos nos últimos N jogos

λ_home = λ_ataque_home × λ_defesa_away × fator_casa
λ_away = λ_ataque_away × λ_defesa_home

P(X gols do home) = e^(-λ_home) × λ_home^X / X!
P(Y gols do away) = e^(-λ_away) × λ_away^Y / Y!

P(home vence) = Σ P(X > Y) para X, Y de 0 a 10
P(empate)     = Σ P(X = Y)
P(away vence) = Σ P(X < Y)
```

O **Elo** ajusta as probabilidades com base na força histórica relativa dos times, especialmente em confrontos diretos (H2H). Para **outros mercados** (escanteios, cartões, chutes), o mesmo modelo de Poisson é aplicado com lambdas específicos por família de mercado, derivados das médias reais de `getFixtureStatistics`.

#### De-vig (remoção da margem)

A casa sempre embute uma margem nas odds. O de-vig remove essa margem para descobrir a probabilidade que a casa *realmente* acredita:

```
odd_home = 2.10  →  prob_implícita_home = 1/2.10 = 47.6%
odd_draw = 3.20  →  prob_implícita_draw = 1/3.20 = 31.3%
odd_away = 3.80  →  prob_implícita_away = 1/3.80 = 26.3%

Soma = 105.2%  →  margem da casa = 5.2%

Prob de-vigged_home = 47.6% / 1.052 = 45.2%
Prob de-vigged_draw = 31.3% / 1.052 = 29.8%
Prob de-vigged_away = 26.3% / 1.052 = 25.0%

Soma de-vigged = 100.0% ✓
```

#### Value (EV positivo)

```
EV = (prob_modelo × odd) − 1

Se EV > 0.03 (+3%): aposta tem valor → candidata ao card
Se EV < 0: a casa leva vantagem → descartada
```

#### Kelly Criterion

```
f* = (b × p − q) / b

onde:
  b = odd − 1  (lucro por unidade apostada)
  p = probabilidade real (nosso modelo)
  q = 1 − p   (probabilidade de perder)

f* = fração do bankroll a apostar
```

O sistema usa **Kelly fracionado** (25–50% do Kelly pleno) para controlar a variância. A stake final ainda respeita o teto do ciclo e o nível de risco do mandato.

### 4.6 Múltiplas e SGM

O `CycleBuilder` pode montar apostas com múltiplas pernas, mas com regras de honestidade:

- **Múltipla entre jogos diferentes:** as pernas são aproximadamente independentes — o EV combinado é calculado normalmente.
- **SGM (mesmo jogo):** as pernas têm correlação — gol e cartões no mesmo jogo não são independentes. Regra: se a Betano já disponibiliza a odd final da SGM no print, usa-se ela (verdade do mercado). Se o usuário monta a SGM manualmente, aplica-se um **haircut de correlação** documentado e o card exibe um aviso explicando o risco adicional.

### 4.7 Agentes de contexto

O **ContextAgent** usa pesquisa na internet para preencher o que a estatística sozinha não captura:

- Lesões e suspensões de última hora
- Peso do jogo (final de campeonato × amistoso × jogo para cumprir tabela)
- Perfil do árbitro (tendência a dar cartões)
- Condições climáticas

O resultado são **multiplicadores de ajuste** por mercado (ex: jogo decisivo → +20% em cartões, −10% em gols abertos). Tudo é cacheado por jogo/dia para não repetir chamadas caras.

### 4.8 Aprendizado individual e coletivo

Depois de cada resultado registrado pelo usuário:

**Aprendizado individual** (`betting_learning/individual`):
- Por mercado (gols, escanteios, cartões), o sistema registra quantas vezes o modelo acertou e errou
- Próximas análises do mesmo usuário são calibradas com esse histórico

**Aprendizado coletivo** (`betting_learning_global/model`):
- O `zeLearnNightly` roda todo dia e agrega os resultados de **todos** os usuários
- Atualiza os ratings Elo dos times com base nos resultados reais
- Recalibra os parâmetros do Poisson por campeonato

Quanto mais usuários usam, mais preciso o modelo fica — sem nunca expor dados pessoais de um usuário para outro.

### 4.9 Desmascarador de Guru

O usuário fotografa o "bilhete do tipster" e o sistema:

1. Lê todas as pernas via Vision
2. Calcula a probabilidade real de cada perna com o motor
3. Calcula a margem da casa em cada uma
4. Mostra o resultado honesto: "esse bilhete tem 2.3% de chance real de acertar tudo"

O resultado é exibido num card compartilhável — feito para viralizar como contra-argumento a apostadores de guru.

### 4.10 Trava de dopamina

Quando o usuário ganha e fecha um ciclo positivo, o sistema **não** libera o próximo ciclo automaticamente. Ele pede um print do comprovante de saque. O Vision valida que é um saque real da Betano. Só depois o próximo ciclo é liberado.

O objetivo é quebrar o loop "ganhou → aposta tudo de volta". O dinheiro precisa sair da conta antes de entrar num novo ciclo.

### 4.11 Guard rails de jogo responsável

O módulo verifica a fase financeira do usuário antes de qualquer ciclo:

| Fase | Comportamento |
|---|---|
| `survival` | Módulo bloqueado. Mensagem empática. |
| `reorganizing` | Módulo bloqueado. Sugestão de sair das dívidas primeiro. |
| `stabilizing` | Permitido com stake máxima reduzida (50% do Kelly) |
| `accumulating` | Permitido com stake moderada (75% do Kelly) |
| `growing` | Stake plena |

O cross-over com o Zé Gastão também verifica a fatura do cartão e o saldo do mês: se o usuário estiver negativo no mês, o teto da stake é reduzido automaticamente.

---

## 5. Coerência financeira — como os dados conversam

Este é um dos aspectos mais importantes do sistema: **todos os dados financeiros se influenciam mutuamente**. Não há número estático ou estimativa onde há dado real.

### 5.1 Fluxo de dados no Dashboard

```
Contas (Account)
    └─ balance (âncora manual)
    └─ balancedAt (data da última conferência)
    └─ computeBalance(conta, todasTransações)
            │
            └─ soma apenas transações onde:
                   accountId == conta.id
                   AND date > balancedAt
                   AND NOT isNeutral(category)
            │
            ▼
        Saldo real da conta

Transações do mês (filtradas por viewMonth)
    └─ isNeutral(category)?
            └─ Sim → descartada do cálculo de entradas/saídas
            └─ Não → entra no total de entradas ou saídas
    │
    ▼
Entradas reais + Saídas reais + Resultado do mês

Resultado  = Entradas − Saídas
Patrimônio = Σ saldos reais de todas as contas
```

### 5.2 Por que as categorias neutras são excluídas

Se o usuário transfere R$ 1.000 da conta corrente para a poupança, isso **não é renda**. Se paga a fatura do cartão, **não é despesa** (a despesa já foi contabilizada quando ele comprou algo). Incluir essas movimentações inflaria artificialmente as entradas e saídas.

Categorias neutras (movimentações internas):
- `Fatura cartão` — pagamento do cartão, não despesa nova
- `Transferência` — troca entre contas próprias
- `Pagamento fatura` — mesma lógica da fatura do cartão
- `Investimentos` — saída do corrente que vira ativo, não consumo

### 5.3 Navegação entre meses

O Dashboard tem controles ◀/▶ para navegar no histórico. Para cada mês selecionado:

- As transações são filtradas por `date.slice(0, 7) === viewMonth` (formato YYYY-MM)
- O mês anterior é calculado automaticamente para comparação
- O saldo patrimonial continua mostrando o valor atual (não histórico, porque o saldo âncora é sempre o mais recente)

### 5.4 Modo casal

O parceiro tem seu próprio conjunto de dados no Firestore. O hook `usePartnerData` faz uma leitura autorizada dessas coleções e aplica **as mesmas regras** de exclusão de neutras. Resultado: os números do casal são calculados com a mesma lógica que os do usuário individual — sem inconsistências.

---

## 6. Pipeline de extração de extratos

Quando o usuário faz upload de um PDF de extrato bancário:

```
1. onStatementUpload (Storage trigger)
       │
       ▼
2. bank-detector.ts — identifica qual banco é o arquivo
       │
       ▼
3. pdf-parser.ts — extrai texto via pdfjs (sem IA)
       │
       ▼
4. statement-extractor.ts — extrai dívida do cartão se for fatura
   (regex puro: total da fatura, mínimo, vencimento, juros)
       │
       ▼
5. installment-detector.ts — detecta parcelas (ex: "3/12")
       │
       ▼
6. Para cada transação encontrada:
       │
       ├─ keyword-classifier.ts (Tier 0 — regex + palavras-chave)
       │   → ~80% das transações categorizadas sem custo
       │
       ├─ category-cache.ts (Tier 1 — padrões do usuário)
       │   → fuzzy match com histórico do usuário (≥85% de confiança)
       │
       └─ ai-categorizer.ts (Tier 2 — Claude Haiku)
           → só as transações que passaram pelos Tiers 0 e 1 sem resultado
       │
       ▼
7. rules-engine.ts — aplica regras do usuário
       │
       ▼
8. Transações gravadas em users/{uid}/transactions
```

---

## 7. Cloud Functions — o que roda no servidor

### Funções do Zé Gastão

| Função | Trigger | O que faz |
|---|---|---|
| `onStatementUpload` | Storage (upload de arquivo) | Processa PDF de extrato bancário → transações categorizadas |
| `copilotChat` | Chamada do app | Chat com Claude usando contexto financeiro do usuário |
| `categorizeManual` | Chamada do app | Recategoriza uma transação específica |
| `analyzeContract` | Chamada do app | Analisa contratos financeiros (empréstimo, seguro) via Vision |
| `nightlyDigest` | Scheduler (diário) | Dispara fila de tarefas para todos os usuários |
| `processUserDigest` | Cloud Task | Roda digest de um usuário (fase, insights, tarefas, marcos, push) |
| `generateInsightsNow` | Chamada do app | Força regeneração de insights na hora |
| `weeklyDigest` | Scheduler (semanal) | Resumo semanal com destaques e leaderboard |
| `linkPartner` | Chamada do app | Vincula dois usuários no modo casal |
| `depositToSharedCaixinha` | Chamada do app | Parceiro deposita no cofrinho compartilhado |
| `extractTaxData` | Chamada do app | Prepara dados para declaração de Imposto de Renda |
| `recordReferral` | Chamada do app | Registra indicação bem-sucedida |
| `startTrial` | Chamada do app | Inicia período de teste premium |
| `createMPCheckout` | Chamada do app | Cria link de pagamento no Mercado Pago |
| `handleMPWebhook` | Webhook (MercadoPago) | Confirma pagamento → ativa assinatura no Firestore |
| `whatsappWebhook` | Webhook (WhatsApp) | Integração com WhatsApp Business API |

### Funções do Zé Apostador

| Função | Trigger | O que faz |
|---|---|---|
| `zeMandate` | Chamada do app | Get/Set mandato de apostas (orçamento, risco, mercados) |
| `zeCycle` | Chamada do app | Inicia, constrói e encerra ciclos de apostas |
| `zeRecalcCard` | Chamada do app | Recalcula card quando odd muda em tempo real |
| `zeFeedback` | Chamada do app | Registra resultado de uma aposta (win/loss/void) |
| `zeScan` | Scheduler | Pré-analisa jogos dos próximos dias para os usuários |
| `zeLearnNightly` | Scheduler | Atualiza Elo dos times e recalibra Poisson com resultados reais |
| `zeExtractOdds` | Chamada do app | Extrai odds de print da Betano via OCR/Vision |
| `zeGuruAudit` | Chamada do app | Audita bilhete de tipster e calcula probabilidade real |
| `zeWithdrawalProof` | Chamada do app | Valida print de comprovante de saque (trava de dopamina) |
| `zeSettleByPrint` | Chamada do app | Liquida aposta via print do resultado ("Aposta Ganha") |

---

## 8. Modelo de dados (Firestore)

### Coleções por usuário (`users/{uid}/...`)

```
profile/main              — perfil financeiro (renda, fase, metas)
transactions/             — todas as transações (extrato + manual)
accounts/                 — contas bancárias e de investimento
debts/                    — dívidas ativas e encerradas
caixinhas/                — cofrinhos de meta
goals/                    — metas financeiras
insights/latest           — insights do último digest noturno
milestones/               — marcos conquistados
daily_tasks/              — tarefas do dia
uploads/                  — histórico de uploads de extratos
documents/                — documentos e contratos armazenados
categories/               — categorias personalizadas
categoryBudgets/          — orçamentos por categoria
rules/                    — regras automáticas do usuário
creditCards/              — cartões de crédito cadastrados
installments/             — parcelas detectadas
subscription/main         — status da assinatura
sharedFinances/           — configuração do modo casal
referrals/                — indicações feitas
betting_mandate/main      — mandato do Zé Apostador
betting_cycles/           — ciclos de apostas (ativo e histórico)
betting_learning/individual — calibração individual por mercado
```

### Coleções globais

```
betting_learning_global/model  — Elo e calibração coletiva de todos os usuários
betting_cache/                 — cache de fixtures, odds e contexto (TTL por tipo)
betting_analyses/              — análises compartilhadas (cache por jogo/dia)
blog/                          — posts do blog educacional
```

### Tipos principais

```typescript
interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet' | 'investment' | 'other';
  balance: number;       // saldo âncora (informado manualmente)
  balancedAt?: string;   // YYYY-MM-DD da última reconciliação
  emoji?: string;
}

interface Transaction {
  id: string;
  amount: number;        // positivo = entrada, negativo = saída
  date: string;          // YYYY-MM-DD
  description: string;
  category: string;
  accountId?: string;    // vínculo com a conta (alimenta computeBalance)
  source: 'upload' | 'manual' | 'ai';
  aiConfidence?: number;
}

interface ZeMandate {
  cycleBudget: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  targetMultiplier: number;   // ex: 3 = meta de triplicar
  targetAmountBRL?: number;   // meta em R$ (alternativa ao multiplier)
  preferredMarkets: string[];
  disclaimerAccepted: boolean;
  createdAt: Timestamp;
}
```

---

## 9. Stack técnica

### Frontend

| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript 5.9 | UI reativa com tipagem estática |
| Vite 5 | Build e dev server |
| Tailwind CSS + shadcn/ui | Estilização e componentes base |
| Zustand | Estado global (auth, perfil, toggle casal) |
| Firebase SDK 10 | Auth + Firestore + Functions client |
| Lucide React | Ícones |

### Backend (Cloud Functions)

| Tecnologia | Uso |
|---|---|
| Node.js 20 + TypeScript | Runtime e tipagem |
| Firebase Admin SDK 12 | Firestore + Auth server-side |
| Claude API (Anthropic) | IA para chat, categorização e Vision |
| pdfjs-dist | Extração de texto de PDFs sem IA |
| Sentry | Monitoramento de erros |

### Infraestrutura

| Serviço | Uso |
|---|---|
| Firebase Hosting | Hospedagem do frontend |
| Cloud Functions (southamerica-east1) | Backend serverless |
| Firestore | Banco de dados NoSQL em tempo real |
| Cloud Storage | Armazenamento de PDFs enviados |
| Cloud Tasks | Fila de digestão noturna por usuário |
| Cloud Scheduler | Triggers diários e semanais |

### APIs externas

| API | Uso |
|---|---|
| Anthropic Claude (Sonnet + Haiku) | Copiloto, insights, categorização, Vision |
| API-Football | Fixtures, estatísticas e resultados de jogos |
| The Odds API | Odds de múltiplas casas para comparação |
| Mercado Pago | Pagamentos e assinaturas |

---

## 10. Feature flags e ambientes

```bash
# .env (frontend)
VITE_FEATURE_ZE_APOSTADOR=true   # Ativa o módulo de apostas
VITE_HOTMART_URL=https://...     # URL de checkout da assinatura

# functions/.env (backend — NUNCA expor no frontend)
ANTHROPIC_API_KEY=sk-ant-...
MP_ACCESS_TOKEN=...
MP_WEBHOOK_SECRET=...
SENTRY_DSN=...
API_FOOTBALL_KEY=...
THE_ODDS_API_KEY=...
ZE_APOSTADOR_ENABLED=true        # Guard extra no backend
```

O Zé Apostador tem **dois guards independentes**:
- **Frontend:** `VITE_FEATURE_ZE_APOSTADOR` — esconde rotas e menus
- **Backend:** `ZE_APOSTADOR_ENABLED` — bloqueia as Cloud Functions mesmo se alguém descobrir a rota

---

## 11. Como desenvolver localmente

### Pré-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Conta no Firebase com projeto configurado

### Frontend

```bash
cd zegastao-main
npm install
npm run dev          # Inicia em http://localhost:5173
npm run lint         # TypeScript type-check
npm run build        # Build de produção
```

### Backend (Cloud Functions)

```bash
cd zegastao-main/functions
npm install
npm run build        # Compila TypeScript → JavaScript
npm test             # Roda testes unitários (Jest)
```

### Deploy

```bash
# Deploy completo
firebase deploy

# Deploy apenas do frontend
firebase deploy --only hosting

# Deploy de uma função específica
firebase deploy --only functions:zeCycle

# Deploy de múltiplas funções
firebase deploy --only functions:zeMandate,functions:zeCycle
```

### Branch de desenvolvimento

Toda a feature atual está na branch `claude/ze-apostador-redesign-fr2yoj`. Nunca fazer merge direto para `main` sem revisão.

---

## Sobre o projeto

O Zé Gastão é um projeto em desenvolvimento ativo. A visão é ser o copiloto financeiro mais honesto e completo para o brasileiro — da organização do dia a dia até a gestão de apostas esportivas com responsabilidade.

**Não prometemos resultados. Prometemos clareza.**
