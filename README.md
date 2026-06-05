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

## Modelo de dados (Firestore)

`users/{uid}` → `profile`, `transactions`, `debts`, `goals`, `rules`, `rule_applications`,
`category_cache`, `uploads`, `insights/latest`, `journey_milestones`, `daily_tasks/today`,
`investments`.

> Single-user MVP. Sem complexidade multi-tenant.
