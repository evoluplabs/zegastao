# Zé Apostador 2.0 — Especificação (planta de execução)

> Documento de planejamento. Define **o que** será construído e **como**, antes de
> qualquer código de feature. Aprovado o texto, parte-se para a implementação.
>
> Branch: `claude/ze-apostador-redesign-fr2yoj` · Data: 2026-06-24 · Status: **aguardando aprovação**

---

## 1. Visão em uma frase

O Zé Apostador é um **co-piloto de apostas guiadas, vivo e honesto**, que faz o trabalho
minucioso de análise por um trabalhador comum, monta as apostas (inclusive múltiplas de
alavancagem), **explica em linguagem de quebrada** por que recomenda cada uma, **pede
autorização por nível de risco** (como as permissões do Claude) e **aprende** com o
resultado real de cada usuário — tudo rodando **a custo ~R$ 0** sobre a stack Firebase atual.

### Princípios inegociáveis

1. **Honestidade matemática.** O sistema nunca esconde o trade-off. Múltipla agressiva é
   servida, mas sempre com a conta verdadeira na frente (ver §8, *selo de entendimento*).
2. **Número nenhum sai de um LLM.** Odds, probabilidades, stakes e EV são 100%
   responsabilidade do motor determinístico (§7). O texto é template (§9).
3. **O usuário no controle do próprio dinheiro.** Sem bot, sem automação na conta da
   Betano. Execução guiada (card) → evolução futura para one-tap via deep link (§13).
4. **Custo ~R$ 0 por design.** Planos grátis + cache coletivo + feedback do usuário como
   sensor (§11, §12). Escala paga só entra com receita.
5. **Jogo responsável como feature, não rodapé.** Público de baixa renda; Lei 14.790/2023
   em vigor. Guard-rails são parte do produto (§14).

---

## 2. O que aproveitamos do Zé Apostador atual

O código de hoje (`functions/src/services/betting/`) é um **recomendador pré-jogo em lote**.
É um bom MVP e a base de agentes é reaproveitável. Veredito por peça:

| Peça atual | Destino |
|---|---|
| `orchestrator.ts` (9 agentes, 4 fases) | **Refatorar** → vira o "scan AIOS" agendado + montagem de candidatos |
| `form/h2h/stats/injury/match-context-agent.ts` | **Manter**, com cache coletivo por `(time/liga, data)` |
| `odds-value-agent.ts` | **Manter/expandir** → de-vig + detecção de valor |
| `kelly.ts` | **Manter** → núcleo de staking; alimenta o recálculo dinâmico do card |
| `risk-manager-agent.ts` | **Manter/expandir** → integra com os 4 níveis de autorização |
| `bet-history-agent.ts` | **Evoluir** → motor de aprendizado individual (§11) |
| `strategy-agent.ts` (LLM decide aposta) | **Substituir** → decisão passa a ser determinística (§7) |
| `consolidator.ts` (LLM escreve narrativa) | **Substituir** → biblioteca de templates (§9) |
| `sports-api.ts` | **Manter**, com camada de cache na frente |
| `betAnalysis.ts` / `bettingProfile.ts` | **Refatorar** para o novo modelo (mandato/ciclo) |
| Frontend `src/pages/betting/*` | **Reconstruir** no padrão visual Betano + card dinâmico |

Nada é jogado fora à toa: a orquestração e o staking são o ativo; o que sai é o uso de LLM
no caminho crítico de decisão e redação.

---

## 3. Arquitetura (100% Firebase, pré-jogo, determinístico-first)

```
┌─────────────────────────── Frontend (React/Vite) ───────────────────────────┐
│  Onboarding do Mandato · Painel do Ciclo · Card Guiado Dinâmico · Histórico  │
│  Selos de autorização · ShareableCard (member-to-member)                     │
└───────────────┬──────────────────────────────────────────────┬──────────────┘
                │ callable Functions                            │ Firestore listeners (tempo real do app)
┌───────────────▼──────────────────────────────────────────────▼──────────────┐
│                          Cloud Functions (Node 20)                            │
│  • zeMandate           (CRUD do mandato/perfil de ciclo)                      │
│  • zeCycle             (cria/avança ciclo, monta rodadas)                     │
│  • zeRecalcCard        (recálculo determinístico ao informar odd real)        │
│  • zeFeedback          (registra odd real, resultado, aposta colocada)        │
│  • zeScan  (AGENDADA)  (Cloud Scheduler: varre jogos, monta candidatos)       │
│  • zeLearnNightly (AGENDADA) (liquida, calibra individual + reagrega coletivo)│
└───────────────┬───────────────────────────────────────────────┬─────────────┘
                │ motor determinístico (TS puro, grátis)          │ APIs externas (cacheadas)
┌───────────────▼─────────────┐                  ┌────────────────▼─────────────┐
│  Poisson · Elo · de-vig ·   │                  │  API-Football (free)          │
│  value · Kelly · múltiplas  │                  │  The Odds API (free, opcional)│
│  templates (voz do Zé)      │                  │  → cache coletivo no Firestore│
└─────────────────────────────┘                  └───────────────────────────────┘
```

- **Sem tempo real, sem websockets, sem serviço externo** (sem Cloud Run, sem Cloudflare).
  Tudo cabe em Functions on-call + Functions agendadas, como o resto do Zé Gastão.
- **Notificações**: FCM (push) quando o `zeScan` encontra oportunidade para um ciclo ativo.
- **Cashout/tempo real**: explicitamente **fora de escopo** (§15, Fase futura).

---

## 4. Modelo de dados (Firestore)

Tudo sob `users/{uid}` (segue as `firestore.rules` atuais; ver §14 para ajustes).

```
users/{uid}/
  betting_mandate/main            ← o "contrato" do usuário (substitui betting_profile)
  betting_cycles/{cycleId}        ← ciclos de alavancagem
  betting_cycles/{cycleId}/rounds/{roundId}   ← rodadas (uma aposta simples ou uma múltipla)
  betting_feedback/{feedbackId}   ← odd real informada + resultado (motor de aprendizado)
  betting_learning/individual     ← calibração pessoal (taxa de acerto por mercado/liga/nível)

# Coleções globais (compartilhadas / sem PII):
betting_cache/{cacheKey}          ← cache coletivo de dados de API (form, h2h, stats, fixtures)
betting_learning_global/model     ← modelo coletivo agregado e anônimo
betting_analyses/{docId}          ← (mantida) snapshot de cada análise, com userId
```

### `betting_mandate/main`
```ts
{
  // Orçamento e metas
  cycleBudget: number;          // orçamento por ciclo (ex: R$ 20)
  growthTargetPct: number;      // meta de crescimento do ciclo (ex: 30%)
  stopLossPct: number;          // corta o ciclo se cair X% (ex: 50%)
  // Escopo de jogo
  preferredLeagues: string[];
  preferredTeams: string[];
  blockedTeams: string[];       // "não aposto contra meu time"
  // Autorização (ver §8)
  maxAutoRiskLevel: 0|1|2|3;    // até que nível o Zé monta sem perguntar de novo
  preauthorizedScope: { maxStakePerCycle: number; allowMultiples: boolean };
  // Jogo responsável
  acceptedRiskDisclaimer: boolean;
  selfExclusionUntil?: Timestamp;
  // Estado
  activeCycleId?: string;
}
```

### `betting_cycles/{cycleId}`
```ts
{
  status: 'planning'|'awaiting_games'|'placed'|'settling'|'won'|'lost'|'aborted';
  budget: number;
  growthTargetPct: number;
  currentBankroll: number;      // recomposição ao longo do ciclo
  riskLevel: 0|1|2|3;
  roundIds: string[];
  startedAt: Timestamp; closedAt?: Timestamp;
  summary: string;              // template, voz do Zé
}
```

### `betting_cycles/{cycleId}/rounds/{roundId}`
```ts
{
  type: 'single'|'multiple';
  legs: Array<{
    fixtureId: number; homeTeam: string; awayTeam: string; league: string; kickoff: string;
    market: string; selection: string;
    modelProb: number;          // p estimado pelo motor (NUNCA do LLM)
    recommendedOdd: number;     // odd mínima
    fairOdd: number;            // 1/modelProb
    userEnteredOdd?: number;    // odd real informada (feedback)
    legOutcome?: 'hit'|'miss'|'void'|'pending';
  }>;
  combinedOdd: number;          // produto das odds (múltipla)
  combinedProb: number;         // produto das probs (independência assumida — ver nota §7)
  ev: number;                   // valor esperado (pode ser negativo no nível agressivo)
  suggestedStake: number;       // Kelly fracionário, dentro dos tetos
  card: GuidedCard;             // §9 — o que renderiza
  authLevel: 0|1|2|3;
  authConfirmedAt?: Timestamp;  // selo de entendimento
  placed: boolean; placedAt?: Timestamp;
  outcome: 'pending'|'won'|'lost'|'partial'|'void';
  payout?: number;
}
```

### `betting_cache/{cacheKey}` (global, sem PII — economia de API §12)
```ts
// cacheKey ex: "form_team_127_2026-06-24"  |  "h2h_127_131"  |  "fixtures_71_2026-06-24"
{ payload: unknown; source: 'api-football'|'odds-api'; fetchedAt: Timestamp; ttlHours: number; }
```

### `betting_learning/individual` e `betting_learning_global/model`
Ver §11.

---

## 5. Máquina de estados do Ciclo

```
            criar mandato
                 │
                 ▼
        ┌──────────────┐   zeScan acha jogos    ┌────────────────┐
        │  planning    │ ─────────────────────▶ │ awaiting_games │
        └──────────────┘                        └───────┬────────┘
                 ▲                                       │ usuário autoriza + aposta (card)
                 │ recompõe banca e abre nova rodada     ▼
        ┌────────┴────────┐    jogos terminam     ┌──────────────┐
        │     settling    │ ◀──────────────────── │    placed    │
        └────────┬────────┘                       └──────────────┘
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
   won (meta)  lost (stop)  continua → nova rodada até meta/stop/prazo
```

- O ciclo é **vivo** mas movido por eventos baratos: `zeScan` (agendado) propõe; o usuário
  autoriza; `zeLearnNightly` (agendado) liquida e recompõe. Sem processo contínuo.
- `won`: atingiu `growthTargetPct`. `lost`: bateu `stopLossPct`. `aborted`: usuário parou.

---

## 6. Pipeline AIOS (agentes)

**Fase de coleta (cacheada, grátis):** FormAgent, H2HAgent, StatsAgent, InjuryAgent,
MatchContextAgent — reaproveitados, com leitura via `betting_cache` antes de chamar a API.

**Fase de decisão (determinística, §7):** substitui o `strategy-agent` por um **ValueEngine**
que, para cada jogo, estima `p` (Poisson + Elo + ajuste contextual), calcula a odd justa,
compara com a odd de mercado e marca os candidatos com valor.

**Fase de montagem:** o **CycleBuilder** monta rodadas (simples ou múltiplas) que respeitam o
mandato, o nível de risco e a meta do ciclo. Múltiplas seguem a regra de §7.

**Fase de explicação (template, §9):** o **CardComposer** gera o card guiado e a "sublegenda"
do raciocínio, 100% por template.

**Agente de aprendizado:** roda no `zeLearnNightly` (§11).

> O `zeScan` agendado roda o pipeline para as ligas/jogos do dia dos mandatos ativos e
> guarda candidatos; o usuário recebe push e abre o app já com a rodada montada.

---

## 7. Motor determinístico (o dono dos números)

Tudo em TypeScript puro nas Functions (grátis, testável com `__tests__`):

- **Gols (Poisson):** λ por time a partir de médias recentes (já temos em `stats-agent`);
  deriva probabilidades de Over/Under, BTTS e placares.
- **Resultado (Elo/ratings):** rating por time atualizado com resultados; converte em
  probabilidade 1X2; ajustado por mando de campo, forma e desfalques.
- **De-vig:** remove a margem da casa da odd informada para obter a probabilidade implícita
  "limpa" do mercado; combina com o modelo próprio (blend) para o `modelProb` final.
- **Detecção de valor:** `value = modelProb × odd − 1`. Só é "valor" se `> 0`.
- **Staking (Kelly):** `kelly.ts` atual (½ Kelly, tetos). Define `suggestedStake`.
- **Montagem de múltiplas:**
  - **Nível 0–1:** só entram pernas com `value > 0`. A múltipla resultante tende a +EV.
  - **Nível 2 (moonshot):** aceita pernas neutras/negativas para alcançar a meta do usuário,
    **mas calcula e exibe o EV real** (geralmente negativo) e exige o selo de §8.
  - **Nota de honestidade:** assumimos independência entre pernas para `combinedProb`. Há
    correlação real (ex: dois jogos do mesmo campeonato); o template avisa quando a múltipla
    é longa que "quanto mais jogos, mais difícil — e a casa lucra mais com isso".

---

## 8. Os 4 níveis de autorização (modelo de permissões, à la Claude)

| Nível | Cor | O que é | Como autoriza |
|---|---|---|---|
| **0 — Conservador** | 🟢 | Só pernas `value > 0`; simples ou múltipla curta | Autorização padrão do mandato |
| **1 — Moderado** | 🟡 | Múltiplas médias, mix de valor e neutras | Confirma por rodada |
| **2 — Agressivo / Moonshot** | 🟠 | Múltipla longa, EV provavelmente negativo, alta variância | **Selo de entendimento por aposta** |
| **3 — Pré-autorizado** | 🔵 | Zé monta e **notifica** dentro do escopo (`maxAutoRiskLevel`, `maxStakePerCycle`) | "Sempre permitir" — execução continua exigindo o toque do usuário no card |

### Selo de entendimento (nível 2)
Antes de liberar uma moonshot, o card mostra, em linguagem simples e obrigatória:

> *"Essa é uma fézinha de sorte 🎲. Chance real de dar certo: ~3%. Se der, paga R$ 487. Mas é
> tipo bilhete de rifa: em 100 tentativas dessas, o normal é sair no prejuízo. Topa mesmo
> assim com seus R$ 2?"*  → **[Topo, é diversão]** / **[Não, me mostra algo mais seguro]**

O sistema **serve** o objetivo do usuário (orçamento baixo + meta alta → ele pode pedir a
agressiva), sem nunca esconder a verdade. Honestidade vira UX, não censura.

---

## 9. Card guiado dinâmico + biblioteca de templates

### Estrutura do card (`GuidedCard`)
- **Cabeçalho:** jogo, mercado, seleção, **odd mínima** ("só vale se ≥ 1.80").
- **Passo a passo numerado:** abrir Betano → buscar jogo → ir ao mercado → conferir odd →
  apostar R$ Y.
- **Campo "qual odd você encontrou?"** → dispara o recálculo dinâmico (abaixo).
- **Botão "Apostei ✅"** → cria/atualiza a rodada como `placed`/`pending`.
- **Selo de entendimento** (se nível 2).
- **"Por que essa aposta?"** → sublegenda transparente do raciocínio (template).
- **Botão "Compartilhar"** → §10.

### Recálculo dinâmico ao informar a odd real (determinístico, local, R$ 0)
Sejam `p = modelProb`, `odd_justa = 1/p`, `odd_rec` = recomendada:

| Cenário | Condição | Ação do card |
|---|---|---|
| 🟢 Tá valendo | `odd_real ≥ odd_rec` | "Confirma! Stake R$ Y" (Kelly com odd real) |
| 🔵 Subiu | `odd_real` bem acima | "Subiu — dá pra apostar um pouco mais: R$ Y→Z" (Kelly ↑, dentro do teto) |
| 🟡 Caiu, ainda vale | `odd_justa < odd_real < odd_rec` | "Apertou a margem. Baixei o valor de R$ Y pra Z." |
| 🔴 Perdeu valor | `odd_real ≤ odd_justa` | "A essa odd não vale mais. 👉 Alternativa:" → próximo candidato com valor, ou pular |

Implementado via `zeRecalcCard` (callable) ou client-side puro — sem nova chamada de API,
porque `p` e o leque de candidatos já estão calculados.

### Biblioteca de templates ("voz do Zé")
- Módulo `templates/` com funções por cenário (`valueFound`, `noValue`, `oddDropped`,
  `oddRose`, `injuryImpact`, `moonshotSeal`, `cycleProgress`...), preenchidas com os números
  do motor.
- **Vantagens** (por que é melhor que LLM aqui, não só mais barato):
  consistência de marca, testável por unidade, instantâneo/offline, **zero alucinação** num
  app que mexe com dinheiro.
- LLM fica como **opcional futuro** ("explica melhor 🔍" sob demanda), nunca no caminho crítico.

---

## 10. Compartilhamento member-to-member (crescimento viral)

Reaproveita a infra existente: `ShareableCard.tsx`, `shareNodeAsImage` / `shareViaWhatsApp`
(`@/lib/shareImage`), `track`/`Events` e o `referralCode` do profile.

- Novo componente `ShareableBetCard` (ou variante de `ShareableCard`) renderiza o card como
  **imagem PNG 4:5** no padrão visual Betano/Zé, **sem dados sensíveis** (mostra o palpite,
  a odd e o resultado/ganho — nunca CPF, saldo, etc.).
- Dois caminhos: **imagem** (Web Share API / download p/ status e stories) e **texto no
  WhatsApp** (deep link `wa.me`), ambos já suportados pelo `shareImage`.
- O texto inclui o **`referralCode`** do usuário → member-to-member rastreável (já existe o
  índice `profile.referralCode` em `firestore.indexes.json` e a função `recordReferral`).
- **Momentos de compartilhamento:** "green" (aposta ganha), progresso de ciclo, e o palpite
  do dia. Tracking via analytics para medir o coeficiente viral.
- **Jogo responsável:** nunca incentivar terceiros a apostar valores altos; o card de green
  reforça o tom "fézinha consciente", não "fique rico".

---

## 11. Loop de feedback do usuário (economia + aprendizado)

O usuário é o **sensor** do sistema. Cada confirmação faz três coisas de uma vez:
economiza chamada de odds, economiza chamada de resultado, e gera dado rotulado de treino.

### O que pedimos e quando
1. Ao montar a aposta: **"qual odd você encontrou na Betano?"** (já no recálculo dinâmico).
2. Ao apostar: **"Apostei ✅"** (valor confirmado).
3. Após o jogo: **"Ganhou ou perdeu?"** + valor recebido.

### Aprendizado em 2 níveis
- **Individual (`betting_learning/individual`):** taxa de acerto por mercado, liga, nível de
  risco e faixa de odd **deste usuário**. Ajusta a confiança e o ranking de candidatos para ele.
  (Evolução do `bet-history-agent` atual.)
- **Coletivo (`betting_learning_global/model`):** agregação anônima de todos os feedbacks no
  `zeLearnNightly` — calibra o motor (ex: "no Brasileirão, nosso Over 2.5 está saindo 8%
  acima do real → corrige λ do Poisson"). Sem PII.
- **Cold-start:** dia 1 o motor é puramente matemático (Poisson/Elo/de-vig). Conforme o
  feedback chega, a calibração entra. Funciona desde o início, melhora com o uso.

### Incentivo ao feedback (ponto crítico do modelo grátis)
Se ninguém reporta, o aprendizado morre de fome. Mitigações de produto:
- Medidor **"o Zé tá ficando mais esperto com você 🧠"** que avança a cada feedback.
- Desbloqueio de mais análises/dia para quem mantém o histórico em dia.
- Lembrete leve via push no dia seguinte ao jogo ("e aí, foi green?").

---

## 12. Cache coletivo (esticando o plano grátis)

- Antes de chamar API-Football/Odds API, consultar `betting_cache/{cacheKey}` com TTL.
- Chave por `(time/liga/confronto, data)`. Como vários usuários analisam os mesmos jogos
  (Brasileirão), o 2º usuário em diante lê do cache → **request = 0**.
- TTLs: forma/H2H/stats ~12–24h; fixtures do dia ~6h; tabela ~24h.
- Resultado: o limite de **100 req/dia** da API-Football grátis comporta um beta de dezenas
  de usuários nas ligas principais. The Odds API quase não é usada (odd vem do usuário).

---

## 13. Execução: card guiado agora, one-tap depois

- **Agora (MVP):** o **card guiado é o protagonista** — instruções passo a passo + recálculo
  dinâmico. Zero risco, zero custo, zero violação de TOS.
- **Evolução (Fase 3):** **one-tap híbrido** — deep link da Betano (via programa de afiliados)
  com o boletim pré-preenchido; **se o deep link falhar, cai automaticamente no card guiado**.
  Nunca trava o usuário. Nunca toca na conta dele.
- **Nunca:** automação de navegador logado / pedir credenciais (risco de ban e confisco).

---

## 14. Jogo responsável & compliance

- Mantém e expande os guard-rails atuais: bloqueio em fase financeira frágil
  (`survival`/`reorganizing`), auto-exclusão, teto de orçamento, disclaimer.
- **Stop-loss de ciclo** e alerta de perda acumulada.
- Lei 14.790/2023 (Bets, em vigor): linguagem responsável, sem promessa de ganho, sem
  incentivo a apostar além do limite; o compartilhamento (§10) segue essa linha.
- **`firestore.rules`:** adicionar regras para as novas coleções
  (`betting_cycles/**`, `betting_feedback/**`, `betting_learning/**` sob o dono; `betting_cache`
  e `betting_learning_global` com leitura autenticada e escrita só via Functions/admin).
- **Feature flag:** segue atrás de `ZE_APOSTADOR_ENABLED` (backend) e
  `VITE_FEATURE_ZE_APOSTADOR` (frontend), como hoje.

---

## 15. Custos

| Item | Fase 1 (MVP, este escopo) | Futuro (com receita) |
|---|---|---|
| API-Football | **Grátis** (100 req/dia) + cache coletivo | Pro US$ 19/mês |
| The Odds API | **Grátis** / quase não usada | 20K US$ 30/mês |
| Anthropic (LLM) | **R$ 0** em modo template-only | centavos se ligar "explica melhor" |
| Firebase | dentro do plano atual do Zé Gastão | escala conforme uso |
| **Total incremental** | **~R$ 0** | ~R$ 300/mês quando justificar |

Tempo real / cashout (feeds enterprise, milhares/mês) permanece **fora de escopo**.

---

## 16. Roadmap em fases

- **F0 — Fundação:** modelo de dados (§4), `firestore.rules`, feature flag, motor
  determinístico (§7) com testes unitários, camada de cache (§12).
- **F1 — Núcleo jogável:** onboarding do mandato, `zeScan` agendado, CycleBuilder, **card
  guiado dinâmico** (§9), níveis de autorização + selo (§8), loop de feedback (§11).
- **F2 — Aprendizado:** `zeLearnNightly`, calibração individual + modelo coletivo, medidor
  "Zé mais esperto".
- **F3 — Crescimento + one-tap:** `ShareableBetCard` member-to-member (§10), deep link
  híbrido da Betano (§13).
- **F4 — (futuro, fora de escopo):** tempo real / cashout assistido, dados pagos.

---

## 17. Riscos & decisões em aberto

1. **Adesão ao feedback** — risco nº 1 do modelo grátis. Mitigado por gamificação (§11), mas
   é hipótese a validar com usuários reais.
2. **Correlação em múltiplas** — `combinedProb` assume independência; o template avisa, mas a
   calibração coletiva (§11) deve corrigir com o tempo.
3. **Odds da Betano via API** — podem não vir; por isso o usuário informa a odd real (§9) e o
   EV usa o consenso de mercado de-vigged. Honesto e suficiente.
4. **Limite de 100 req/dia** — comporta beta, não massa. Definir teto de usuários do beta.

---

## 18. Métricas de sucesso (beta)

- % de rodadas com feedback de resultado preenchido (saúde do aprendizado).
- Acerto do motor vs. mercado (calibração) ao longo do tempo.
- ROI médio dos usuários por nível de autorização (a verdade nua sobre alavancagem).
- Coeficiente viral do `ShareableBetCard` (compartilhamentos → novos usuários).
- Retenção de ciclo (quantos completam um ciclo inteiro).

---

> **Próximo passo:** aprovado este documento, inicio pela **F0** (fundação + motor
> determinístico com testes), sem ativar a feature em produção (segue atrás da flag).

---

## Adendo 2.1 — Vision-first + Orquestração real (entregue)

Evolução implementada sobre o 2.0, mantendo todos os princípios (custo ~R$ 0, número
nenhum de LLM, jogo responsável, atrás da flag) e adicionando a pirâmide **"código antes
de API/IA"** (Tier 0 código → Tier 1 OCR grátis → Tier 2 Vision → web search por último).

- **Motor multi-mercado** (`engine/markets.ts`): Poisson para escanteios, cartões, chutes
  e faltas (over/under por linha), além de gols.
- **Extração Vision-first** (`odds-extractor.ts` + `zeVision.ts`): lê o print da Betano por
  OCR+regex (grátis) e só usa Claude Vision no fallback. **Waze das Odds** (cache coletivo)
  faz o 2º usuário do mesmo jogo reaproveitar a leitura. Detecta **SuperOdds**.
- **Orquestração** (`stats-multi.ts`, `context-agent.ts`, `slip-analyzer.ts`, `pipeline.ts`):
  médias reais por time (API) + contexto qualitativo (peso do jogo determinístico; web
  search opcional para lesões/árbitro/clima atrás de `ZE_WEB_SEARCH_ENABLED`) → EV em todos
  os mercados a partir do print.
- **SGM** (múltipla no mesmo jogo) com **haircut de correlação** honesto e selo obrigatório;
  usa a odd final da Betano quando o print a traz.
- **Formulário**: meta em **R$** (vira o multiplicador-alvo do moonshot) + **orçamento
  sugerido** pelo perfil financeiro (`suggest_budget`).
- **Cross-over com o Zé Gastão**: teto de stake por fase financeira (trava da fatura).
- **Fases B/C**: Desmascarador de Guru, **Trava de Dopamina** (saque comprovado por print
  libera novo ciclo), **Liquidação expressa por print**, **Ouvidoria do Fumo** (push
  empático na perda) e **Karma** anti-carona (atrás de `ZE_KARMA_ENABLED`).
- **Telas**: `UploadOdds` (fotografa a Betano) e `GuruAudit` (desmascarador), acessíveis em
  "Ferramentas do Zé" na página de apostas.
