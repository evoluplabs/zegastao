# Plano de Marketing 60 Dias — Zé Gastão
### Nível Growth Hacker · Euempresa · Orçamento Zero

---

## Premissas

- **CAC:** R$0 — 100% canal orgânico
- **Tempo disponível:** ~2h/dia para marketing
- **Ferramentas:** Claude Code Pro, Mixpanel (free), Google Search Console (grátis), WhatsApp Business (grátis), Instagram/TikTok (grátis)
- **Meta de usuários:** 500 cadastros em 60 dias
- **Meta de conversão:** 3% free→paid no mês 2 = ~15 pagantes
- **MRR ao final:** ~R$300–800/mês com CAC = R$0 ← isso é ouro pra investidor

---

## Setup Técnico (Dias 0–3) — ANTES de tudo

> Se o tracking não está rodando, você vai trabalhar sem dados. Isso é trabalho perdido.

### Checklist obrigatório

- [ ] Ativar `VITE_MIXPANEL_TOKEN` no Firebase Hosting (Console > Hosting > Environment variables)
- [ ] Criar conta no Google Search Console e verificar o domínio `zegastao.com.br`
- [ ] Submeter `https://zegastao.com.br/sitemap.xml` no Search Console
- [ ] Criar perfil @zegastao no Instagram (conta profissional)
- [ ] Criar perfil @zegastao no TikTok
- [ ] Configurar WhatsApp Business com número dedicado
  - Foto de perfil profissional
  - Descrição: "Copiloto financeiro para quem quer sair das dívidas 💚"
  - Horário de atendimento
  - Resposta automática fora do horário
- [ ] Criar UTM template para todos os links externos:
  - WhatsApp pessoal: `?utm_source=whatsapp&utm_medium=referral&utm_campaign=rede_pessoal`
  - Instagram: `?utm_source=instagram&utm_medium=social&utm_campaign=organico`
  - TikTok: `?utm_source=tiktok&utm_medium=social&utm_campaign=organico`
  - Grupos FB: `?utm_source=facebook&utm_medium=social&utm_campaign=grupos`

---

## FASE 1 — Dias 1–14: Fundação + Rede Pessoal

**Objetivo:** 50–80 usuários reais, dados comportamentais iniciais, primeiros posts indexados.

---

### Semana 1 (Dias 1–7)

#### Ação 1: Script de WhatsApp pessoal

Envie para **50 contatos** individualmente (não em grupo):

```
"Oi [nome]! Criei um app de finanças chamado Zé Gastão.
É grátis. Ajuda quem tem dívida ou quer organizar o dinheiro.
Fica no celular sem baixar nada.

Se testar, me fala o que achou? 😊
[link com UTM]"
```

**Meta:** 20 cadastros da rede pessoal  
**Regra:** mensagem individual, nunca em grupo. Personaliza com o nome.

---

#### Ação 2: Primeiros vídeos no TikTok/Reels

Formato: vídeo vertical, 30–60s, selfie com narração, SEM edição elaborada.  
O povão se identifica com quem parece real, não com influencer polido.

**Roteiro Vídeo 1 (Dia 2):**
> "Você sabe quanto tá pagando de juros no cartão de crédito por mês?
> Peguei meu extrato aqui e calculei... [mostra número chocante]
> A maioria das pessoas não sabe. Manda esse vídeo pra quem precisa saber isso."

**Roteiro Vídeo 2 (Dia 5):**
> "Fiz um app que calcula em quanto tempo você sai das dívidas.
> Testei com os meus números e o resultado me surpreendeu.
> Link na bio — é grátis pra testar agora."

**Roteiro Vídeo 3 (Dia 7):**
> "Delivery uma vez por semana parece inofensivo né?
> Faz a conta: R$45 × 52 semanas = R$2.340 por ano.
> Não to falando pra parar. To falando pra saber o preço."

---

#### Ação 3: Criar grupos WhatsApp beta

- Cria grupo: "Beta Testers — Zé Gastão 💚"
- Convida 30–50 pessoas próximas que aceitaram testar
- Dinâmica: você posta dica toda semana, eles dão feedback, você resolve dúvida
- Esse grupo vira sua primeira comunidade + fonte de depoimentos reais

---

#### Ação 4: Publicar primeiros 5 posts do blog

Prioridade por volume de busca:
1. `sair-do-vermelho-salario-minimo`
2. `delivery-custo-real-por-ano`
3. `regra-50-30-20-brasil`
4. `juros-cartao-credito-destroem`
5. `dinheiro-acaba-antes-do-mes`

Cada post precisa de uma imagem OG (1200×630px) — crie no Canva grátis.  
Publique no Instagram Stories com link pra cada post.

---

### Semana 2 (Dias 8–14)

#### Ação 5: Entrar em grupos de Facebook

Grupos alvo:
- "Finanças Pessoais Brasil"
- "Livre das Dívidas — Brasil"
- "Renda Extra SP"
- "Concursos Públicos SP" (público que busca renda alternativa)
- Grupos locais da Zona Leste / seu bairro

**Regra de ouro:** Nunca poste link diretamente. Responda perguntas reais por 7 dias antes de mencionar o app. Construa autoridade primeiro.

Template de resposta em grupo:
> "Isso acontece muito! [resposta útil de 3-4 linhas resolvendo o problema]. Se quiser, tem um [post/calculadora] que explica mais sobre isso. Pode me chamar no privado se quiser."

---

#### Ação 6: Ativar sistema de referral no app

O `useReferral` já existe. Certifique-se que está visível pós-onboarding.

**Recompensa:** 1 mês Copiloto grátis para quem trouxer 3 amigos que se cadastrarem.

Cria banner no Dashboard:
> "💚 Traga 3 amigos e ganhe 1 mês do Copiloto grátis"

---

#### Métricas a monitorar no fim da Semana 2

| Métrica | Como verificar |
|---|---|
| Cadastros totais | Admin > Dashboard |
| Fonte dos cadastros | Mixpanel > Source (UTM) |
| Taxa de onboarding completo | Mixpanel > Funnel |
| Posts indexados | Google Search Console |
| Alcance dos vídeos | TikTok/Instagram Analytics |

---

## FASE 2 — Dias 15–30: Validação e Tração Inicial

**Objetivo:** 150–200 usuários, 5–8 pagantes, 3 posts viralizando no WhatsApp.

---

### Semana 3 (Dias 15–21)

#### Ação 7: Publicar mais 8 posts no blog (total 13)

Prioridade:
- `10-bicos-fim-de-semana` (viral + SEO)
- `negociar-divida-banco-guia` (alta busca)
- `nome-sujo-como-limpar` (alta busca)
- `vergonha-falar-de-divida` (emocional = compartilhamento)
- `vender-whatsapp-do-zero`
- `o-que-fazer-com-decimo-terceiro`
- `historia-real-zona-leste-divida` (mais viral)
- `plano-18-meses-salario-1500`

---

#### Ação 8: DM para microinfluenciadores (custo zero)

Busca no Instagram + TikTok: 1k–20k seguidores, tema dívidas/finanças/renda extra/trabalho.

Template de DM:
> "Oi [nome]! Acompanho seu conteúdo sobre [tema específico que ele postou].
> Criei um app chamado Zé Gastão, focado em ajudar quem tá tentando sair das dívidas.
> Te ofereço 3 meses grátis do plano pago pra você testar — sem obrigação de postar nada.
> Se gostar e quiser contar pra sua galera, ótimo. Se não gostar, me fala o que faltou.
> Topa?"

Meta: 10 DMs enviadas, 3–5 respondem, 1–2 postam espontaneamente.

---

#### Ação 9: Criar template de compartilhamento de conquista

Quando usuário avança de fase financeira (ex: Sobrevivência → Reorganização), o app já tem ShareableCard.

Otimize o texto do card para ser naturalmente compartilhável:
> "Saí da fase de Sobrevivência financeira com o Zé Gastão 🎉
> Em [X semanas], organizei R$X de dívida. Grátis pra começar: zegastao.com.br"

---

### Semana 4 (Dias 22–30)

#### Ação 10: Primeiro contato B2B presencial

Identifica 5 empresas locais (preferência Zona Leste / sua região):
- Padaria, lanchonete, salão de beleza, mecânica, pequeno comércio

Pitch presencial ou WhatsApp (3 minutos):
> "Você sabia que 68% dos trabalhadores com dívida têm queda de produtividade?
> Tenho um app financeiro que ajuda funcionários a se organizar — é um benefício corporativo.
> Custa R$15 por funcionário/mês, muito menos que qualquer outro benefício.
> Posso te mostrar como funciona em 5 minutos?"

Meta: 1 empresa piloto, mesmo que seja 5 funcionários = R$75/mês.  
Valor real: depoimento + case study + credibilidade para pitches maiores.

---

#### Ação 11: A/B test na landing page

Testa duas versões do CTA principal:
- Versão A: "Criar conta grátis" (atual)
- Versão B: "Ver meu diagnóstico financeiro grátis"

Use Google Optimize (grátis) ou monitore manualmente trocando a cada semana.

---

## FASE 3 — Dias 31–45: Escala Orgânica + PR

**Objetivo:** 300 usuários, 15–20 pagantes, primeira cobertura de mídia.

---

### Semana 5 e 6

#### Ação 12: Lançar "Desafio 30 dias"

Nome: **#Desafio30DiasZeGastao**

Mecânica:
- Usuário entra no app e ativa o desafio
- Compromisso: 30 dias sem fazer dívida nova
- App monitora e notifica semanalmente o progresso
- No 30º dia: card de conquista para compartilhar no Instagram/WhatsApp

Para o lançamento: convida os usuários do grupo beta para serem os primeiros.  
Posta sobre o desafio 3x/semana no Instagram com stories interativos.

---

#### Ação 13: Contato com mídia (email frio personalizado)

**Targets:**
- Jornalistas de economia do UOL, G1, Folha de SP (busca no LinkedIn pelo nome)
- Repórteres que cobriram "endividamento", "fintech", "educação financeira" (Google News)
- Podcasts: "Me Poupe!", "Primo Pobre", "Mamilos" (DM no Instagram)

Template de email (máximo 4 parágrafos):

```
Assunto: App gratuito ajudou moradores da Zona Leste a sair de R$28k de dívida

Olá [nome],

Sou [você], criador do Zé Gastão — app de educação financeira focado no
brasileiro que ganha até 3 salários mínimos. Em [X semanas] de lançamento,
[Y] pessoas estão usando, [Z%] saíram da fase de endividamento crítico.

O diferencial: funciona no browser, sem instalar nada, e o copiloto de IA
fala a língua do povão — sem jargão financeiro.

Tenho um usuário da Zona Leste, João, que saiu de R$28k de dívida em 14 meses
com salário de operário. Poderia conectar você com ele para uma entrevista?

[seu nome] | [email] | [WhatsApp]
```

---

#### Ação 14: Publicar mais 10 posts (total 25 ativos)

Foco em posts "pilar" (longos, 1500+ palavras, ranqueiam bem):
- Guia completo para sair das dívidas em 2025 (post mestre, linka pra todos os outros)
- Calculadora de prazo de quitação (embed do FinancialSimulator)
- Benchmarks de gastos para o salário mínimo brasileiro

---

#### Ação 15: Backlinks naturais

- Responda perguntas no Quora BR sobre finanças pessoais (com link pro post relevante)
- Comente no Reddit r/financaspessoais e r/brasil com valor real (sem spam)
- Peça aos usuários satisfeitos para deixar avaliação no Google Meu Negócio (se aplicável)

---

## FASE 4 — Dias 46–60: Conversão + Pitch de Investidor

**Objetivo:** 400–500 usuários, 25–40 pagantes, deck pronto para aceleradoras.

---

### Semana 7 e 8

#### Ação 16: Sequência de nurture por email/push

Ative via Firebase Functions + Cloud Messaging:

| Gatilho | Mensagem |
|---|---|
| Dia 1 após cadastro | "Bem-vindo! Aqui está seu primeiro passo: importe seu extrato" |
| Dia 3 sem upload | "Seu diagnóstico está incompleto — falta só o extrato do banco" |
| Dia 7 ativo | "Em 7 dias você já [ação que fez]. Que tal ver quanto economizou?" |
| Dia 21 free | "Você economizou R$X identificando [categoria]. Quer ver mais insights todo dia?" |
| Dia 30 free | "Oferta especial: 1 mês Copiloto por R$9,90 (só esta semana)" |

---

#### Ação 17: Oferta de conversão para usuários antigos

Para quem tem 30+ dias no plano free e nunca converteu:

Push notification + email:
> "Você já usou o Zé Gastão por 30 dias. Que tal desbloquear os insights diários?
> Essa semana: 1 mês por R$9,90 (depois R$19,90). Só até domingo."

---

#### Ação 18: Contato com aceleradoras

| Aceleradora | Tipo | Quando inscrever | Link |
|---|---|---|---|
| **InovAtiva Brasil** | Pré-aceleração gratuita do governo | Editais trimestrais | inovativabrasil.com.br |
| **Cubo Itaú** | Aceleração fintech | Inscrições abertas | cubo.network |
| **WOW Acelera** | Impacto social | Editais periódicos | wowacelera.com.br |
| **Liga Ventures** | Corporate venture | Por indicação | ligaventures.com |
| **Softex** | Programa gov para software | Contínuo | softex.br |

**One-pager para enviar** (1 página, máximo):
- Problema: 70M+ brasileiros com nome sujo
- Solução: copiloto de IA que fala a língua do povo
- Tração: [X usuários], [Y pagantes], [MRR], CAC = R$0
- Modelo: freemium, R$19,90/mês
- Time: solo (euempresa) + Claude Code
- Pedido: [o que você quer da aceleradora]

---

## Métricas para o Pitch de Investidor

> Cole esses dados no painel Admin > Investidor toda semana.

### Métricas obrigatórias (o que todo investidor vai perguntar)

| Métrica | Fórmula | Meta 60 dias |
|---|---|---|
| **MRR** | Pagantes × R$19,90 | R$500–800 |
| **ARR** | MRR × 12 | R$6.000–9.600 |
| **CAC** | Gasto marketing ÷ novos clientes | R$0 |
| **LTV** | ARPU ÷ churn mensal | Calcular |
| **Conversão free→paid** | Pagantes ÷ total | 3–5% |
| **DAU/MAU** | Ativos hoje ÷ ativos no mês | >20% = bom |
| **Churn mensal** | Cancelamentos ÷ base paga | <10% |
| **NPS proxy** | % que compartilhou conquista | >15% |
| **Uploads/usuário** | Total uploads ÷ usuários c/ ≥1 | >2 = engajado |
| **Avanço de fase** | % saiu da Sobrevivência | >20% |

---

### Narrativa do pitch (o que dizer em 2 minutos)

> "O Brasil tem 70 milhões de pessoas com dívida. A maioria não consegue ajuda financeira porque planner cobra R$3.000/hora e app financeiro parece coisa de bancário.
>
> O Zé Gastão é o primeiro copiloto financeiro que fala a língua do povão — analisa suas dívidas, monta um plano e te diz exatamente o que fazer esse mês. Funciona no browser, sem instalar nada.
>
> Em [X dias], temos [Y usuários], [Z pagantes], MRR de R$[valor], CAC = R$0 — crescemos só com orgânico e boca a boca.
>
> Buscamos [R$ valor] para [objetivo específico: time, infra, marketing pago]."

---

## Cronograma Executável Semana a Semana

| Semana | Ação Principal | Meta Usuários | Meta Pagantes | Tempo/dia |
|---|---|---|---|---|
| S1 | Setup + WhatsApp pessoal (50 contatos) + 3 vídeos + 5 posts | 30 | 0 | 2h |
| S2 | Grupos FB + referral ativo + 5 posts | 80 | 2 | 2h |
| S3 | 8 posts + DM microinfluenciadores + template compartilhamento | 130 | 5 | 2h |
| S4 | B2B primeiro contato + A/B test landing + 5 posts | 200 | 8 | 2h |
| S5 | Desafio 30 dias lançado + emails frios pra mídia + 5 posts | 280 | 14 | 2h |
| S6 | Escala conteúdo + backlinks + pillar page | 350 | 20 | 2h |
| S7 | Sequência email nurture + push re-engage + 3 posts | 420 | 28 | 1.5h |
| S8 | Oferta especial + one-pager aceleradora + deck métricas | 500 | 35–40 | 1.5h |

---

## Canais e Frequência de Postagem

| Canal | Frequência | Formato |
|---|---|---|
| **Blog** | 3 posts/semana (Claude Code) | Artigo 600–1500 palavras |
| **Instagram Reels** | 3x/semana (Ter, Qui, Sáb) | Vídeo 30–60s, selfie natural |
| **TikTok** | 3x/semana | Mesmo conteúdo do Instagram |
| **Instagram Stories** | Diário (5min de trabalho) | Link do último post + enquete |
| **WhatsApp grupos** | 1x/semana por grupo | Dica prática + link |
| **WhatsApp pessoal** | Contínuo (resposta rápida) | Suporte, onboarding |
| **Facebook grupos** | 2x/semana por grupo | Resposta a perguntas + valor |

---

## Scripts e Templates Reutilizáveis

### Template de resposta em grupo sobre dívida
> "Cara, isso acontece com muita gente. O problema é que quando você paga só o mínimo do cartão, os juros rodam mais rápido que o pagamento. A saída mais rápida é pegar a dívida mais cara e focar tudo nela primeiro. Se quiser ver um plano calculado pra sua situação, tem uma ferramenta gratuita que faço: [link com UTM]"

### Template de resposta em grupo sobre renda extra
> "Depende do que você já sabe fazer. Entrega de bicicleta dá pra começar amanhã. Venda de marmita ou salgado também, sem precisar de nada além do que você já tem. Se quiser, tenho um artigo com 10 bicos que qualquer pessoa pode começar este fim de semana: [link]"

### DM de follow-up pra quem não ativou (3 dias após cadastro)
> "Oi [nome], tudo bem? Vi que você criou conta no Zé Gastão mas ainda não adicionou suas informações. Tem alguma dúvida de como funciona? Pode me chamar direto aqui — eu mesmo respondo."

---

## Lembretes Finais para o Euempresa

1. **Você é o suporte, comercial, dev e marketing.** Prioriza: o que traz usuário > o que retém usuário > o que monetiza. Nessa ordem.

2. **Não persegue perfeição.** Post imperfeito publicado bate post perfeito que nunca saiu.

3. **Responde todo comentário e DM em até 4h.** No início, essa atenção é vantagem competitiva real.

4. **Documente tudo.** Print do primeiro usuário. Print da primeira conversão. Screenshot do MRR crescendo. Isso vira narrativa de pitch.

5. **CAC = R$0 é seu superpoder.** Nenhuma startup com investimento consegue isso. Use isso como argumento central com investidores.

6. **O blog é ativo permanente.** Post publicado hoje vai trazer usuário em 6 meses. É diferente de ad que some quando para de pagar.

---

*Gerado para Zé Gastão — Plano de 60 dias · Versão 1.0 · Junho 2025*
*Operação solo com Claude Code Pro*
