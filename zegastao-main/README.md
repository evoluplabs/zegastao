# Copiloto Financeiro Pessoal 💸

Um copiloto financeiro para o mercado brasileiro que acompanha o usuário da **fase de
sobrevivência (endividado) até a de investidor**. Não é uma planilha — é um sistema ativo
que importa extratos, categoriza com IA, aplica regras comportamentais, projeta a quitação
de dívidas, calcula a fase financeira e conversa via chat.

> O app começa como gestor de dívidas e termina como assessor de patrimônio.

## Stack

- **Frontend:** React + Vite + TypeScript, Tailwind, Recharts, Zustand, React Router v6
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions Node 20, Cloud Scheduler)
- **IA:** Claude Haiku (categorização barata em lote) + Claude Sonnet (insights/chat),
  via `@anthropic-ai/sdk` **somente nas Cloud Functions**.

## Estratégia de custo de IA (pirâmide)

```
Tier 0 — Keywords (grátis)        keyword-classifier.ts
Tier 1 — Cache Firestore (grátis) category-cache.ts  (+ fuzzy match ≥85%)
Tier 2 — Haiku em lote (barato)   ai-categorizer.ts  (lotes de 50)
Tier 3 — Sonnet (moderado)        insight-engine.ts / copilotChat / task-generator
```

A `ANTHROPIC_API_KEY` vive **apenas** em `functions/.env`, nunca no frontend.

## Jornada / fases

A `financialPhase` é calculada todo dia pelo job noturno (`phase-engine.ts`) e influencia
o tom do copiloto, o foco das tarefas diárias e o que o dashboard mostra:

`survival → reorganizing → stabilizing → accumulating → growing`

Telas de investimento exibem sempre o aviso educacional (não é consultoria CVM).

## Rodando localmente

### 1. Frontend

```bash
npm install
cp .env.local.example .env.local   # preencha com a config do seu projeto Firebase
npm run dev
```

### 2. Cloud Functions

```bash
cd functions
npm install
cp .env.example .env               # preencha ANTHROPIC_API_KEY
npm run build
```

### 3. Firebase

```bash
npm install -g firebase-tools
firebase login
firebase use --add                 # selecione seu projeto
firebase deploy --only firestore:rules,storage,functions
```

Para desenvolvimento com emuladores: `firebase emulators:start`.

## Estrutura

- `functions/src/services/` — toda a lógica (classificação, cache, regras, projeção, fase, parsers)
- `functions/src/functions/` — `onUpload`, `nightlyDigest`, `copilotChat`, `categorizeManual`
- `src/pages/` — Dashboard, Trilha, Importar, Transações, Dívidas, Regras, Metas, Investimentos, Projeção, Copiloto
- `src/hooks/` — listeners do Firestore em tempo real (usam cache offline)

## Projeções, contratos e contexto pessoal

- **Motor de amortização** (`amortization-engine.ts` / `lib/amortization.ts`): tabela Price/SAC,
  adiantamento de parcelas com ROI ("para cada R$1 adiantado, economiza R$X") e comparador de
  até 3 cenários lado a lado. Tudo local, sem IA.
- **Análise de contratos** (`analyzeContract`): upload de PDF em `contracts/` → Sonnet extrai
  taxa, CET, multas, cláusulas em linguagem simples, red flags e oportunidades de negociação;
  cria a dívida correspondente. O PDF **nunca** é deletado do Storage.
- **Contexto pessoal**: diário colaborativo — coluna do usuário (editável) + coluna do copiloto
  (anotações geradas no job noturno: padrões, pontos fortes, áreas de risco, foco da semana).
- **Modo impulso**: o chat detecta vontades de compra, valida o sentimento, mostra o custo real
  e registra o impulso no histórico — sem sermão.
- **Guia de negociação**: scripts prontos por situação + alertas automáticos por dívida.

## Modelo de dados (Firestore)

`users/{uid}` → `profile`, `transactions`, `debts`, `goals`, `rules`, `rule_applications`,
`category_cache`, `uploads`, `insights/latest`, `journey_milestones`, `daily_tasks/today`,
`investments`, `contracts`, `documents`, `negotiation_alerts/latest`,
`personal_context/{user_written,copilot_notes,impulse_history}`.

> Single-user MVP. Sem complexidade multi-tenant.
