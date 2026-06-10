# Manual Mestre de Operações — Zé Gastão
**Versão 1.0 | Junho 2026 | Solo Operator**

---

## 1. CONTAS E CREDENCIAIS

### Separação Pessoal × Empresa

| Serviço | Conta Pessoal | Conta Empresa | Ação Necessária |
|---------|--------------|---------------|-----------------|
| Google | processocristao@gmail.com | admin@zegastao.com.br | ✅ Criar conta Google Workspace |
| Firebase | processocristao@gmail.com | Migrar owner | ⚠️ Adicionar admin@zegastao.com.br como Owner |
| Mercado Pago | Pessoal | MEI (CNPJ) | ⚠️ Abrir conta MP Empresas com CNPJ MEI |
| Instagram | Pessoal | @zegastao | ✅ Criar conta business separada |
| TikTok | Pessoal | @zegastao | ✅ Criar conta TikTok Business |
| Anthropic API | processocristao@gmail.com | Manter | ✅ OK por enquanto |
| Mixpanel | — | Criar projeto ZeGastao | ⚠️ Criar e ativar token |
| Google Analytics | — | UA do zegastao.com.br | ⚠️ Configurar propriedade GA4 |
| Domínio | zegastao.com.br | — | ✅ Verificar renovação anual |

### Credenciais Críticas (nunca compartilhar)
- **Anthropic API Key**: Em `functions/.env` (server-side only, NUNCA no frontend)
- **Firebase Service Account**: Apenas no servidor de CI/CD (nunca no código)
- **Mercado Pago Secret Key**: Em `functions/.env`
- **VITE_FIREBASE_***: Público (ok no código), mas não o service account JSON

### Rotação de API Keys
- Anthropic: a cada 6 meses → console.anthropic.com → API Keys → Rotate
- Mercado Pago: anual ou se suspeitar vazamento
- Firebase: nunca expira (mas revogar se ex-colaborador tiver acesso)

---

## 2. SETUP TÉCNICO (UMA VEZ)

### Variáveis de Ambiente
```bash
# .env.local (frontend - Firebase Hosting)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_MIXPANEL_TOKEN=...            # Ativar quando tiver token
VITE_ADMIN_EMAILS=processocristao@gmail.com,admin@zegastao.com.br

# functions/.env (backend - Cloud Functions)
ANTHROPIC_API_KEY=sk-ant-...
MP_ACCESS_TOKEN=TEST-...           # Trocar por LIVE quando for ao ar
MP_WEBHOOK_SECRET=...
```

### Firebase Hosting — Deploy de Variáveis
```bash
firebase functions:config:set anthropic.key="sk-ant-..." mercadopago.token="APP_USR-..."
# OU via .env no diretório functions/
```

---

## 3. OPERAÇÕES DIÁRIAS (~10 min/dia)

### Checklist Diário
- [ ] Abrir painel admin `/admin` → verificar novos usuários e leads B2B
- [ ] Verificar Firebase Functions → Logs → filtrar por erros das últimas 24h
- [ ] Responder 1 comentário/DM no Instagram @zegastao
- [ ] Conferir Mixpanel: DAU de ontem, funil de conversão

### Como verificar saúde do sistema (via Claude Code)
```
"Acesse os logs do Firebase Functions das últimas 24 horas e me avise se houve erros no nightlyDigest ou copilotChat"
```

### Alertas de Emergência
- **Copilot retornando 500**: Verificar `functions/src/functions/copilotChat.ts` → provavelmente contexto vazio
- **Nightly job falhou**: Dashboard dos usuários não atualiza fase → executar manualmente via Firebase Console
- **Mercado Pago webhook falhou**: Pagamento não processado → verificar logs e reprocessar

---

## 4. OPERAÇÕES SEMANAIS (~2h/semana)

### Segunda-feira: Conteúdo da Semana
- [ ] Escrever/revisar 1 post de blog (use Claude Code: "Escreva um post de blog sobre [tema] seguindo o estilo humano e direto dos outros posts no src/data/blogPosts_part*.ts")
- [ ] Publicar via painel admin `/admin?tab=blog` ou commitar em `src/data/`
- [ ] Atualizar sitemap: `node scripts/generate-sitemap.js`

### Quarta-feira: Redes Sociais (3 posts)
Usar template:
1. **Terça**: Dica financeira prática (ex: "Sabia que pagando R$50 a mais na dívida...")
2. **Quinta**: Resultado de usuário real (com permissão) ou dado do mercado
3. **Sábado**: Post de blog mais recente (reels de 30-60s narrando o texto)

### Sexta-feira: Métricas Semanais
Abrir `/admin?tab=metrics` e registrar no diário:
- Novos cadastros esta semana
- MRR atual
- Novos leads B2B
- Post de blog com mais visualizações (Google Search Console)

---

## 5. DEPLOY E MANUTENÇÃO

### Deploy Frontend (após qualquer mudança de código)
```bash
cd /home/user/zegastao/zegastao-main
npm run build
firebase deploy --only hosting
```

### Deploy Functions (após mudança nas Cloud Functions)
```bash
cd /home/user/zegastao/zegastao-main
firebase deploy --only functions
```

### Deploy Tudo
```bash
firebase deploy
```

### Deploy Regras Firestore
```bash
firebase deploy --only firestore:rules
```

### Verificar Build Antes do Deploy
```bash
npx tsc --noEmit   # verifica tipos TypeScript
npm run build      # build completo
```

### Rollback de Emergência
```bash
# Firebase Hosting mantém histórico → rollback via Console ou:
firebase hosting:channel:list
firebase hosting:clone VERSION_ID live
```

---

## 6. MONITORAMENTO DE SAÚDE DO PRODUTO

### Firebase Functions Logs
- Console Firebase → Functions → Logs
- Filtrar: `severity=ERROR` nas últimas 24h
- Funções críticas: `nightlyDigest`, `copilotChat`, `onStatementUpload`

### Nightly Digest (job mais crítico)
- Roda toda meia-noite (America/Sao_Paulo)
- O que faz: calcula fase financeira + gera contexto do copilot + sugere tarefas diárias
- Se falhar: usuários novos não terão contexto → copilot dá erro 500 (mas agora tem fallback!)
- Como verificar: Firebase Console → Functions → nightlyDigest → última execução

### Budget Firebase (evitar surpresas)
- Plano Spark (free) cobre: 50k leituras/dia, 20k escritas/dia, 1GB storage
- Blaze (pay-as-you-go): necessário para funções agendadas (nightlyDigest)
- Budget alert: configurar em Firebase Console → Billing → Set Budget → $10/mês

### Status do Sistema (via Claude Code)
```
"Analise o arquivo functions/src/functions/nightlyDigest.ts e me diga se há riscos de falha em escala"
```

---

## 7. SEGURANÇA — CHECKLIST DE PRODUÇÃO

### Antes de Ir ao Ar
- [ ] App Check ativado para `copilotChat` (evita abuse sem auth)
- [ ] Rate limiting revisado: 10 msgs/dia free, 50/dia pago
- [ ] Regras Firestore: usuário SÓ acessa seus dados (`request.auth.uid == userId`)
- [ ] Anthropic API key NUNCA no frontend (só em functions/.env)
- [ ] Mercado Pago: token de PRODUÇÃO (não TEST)
- [ ] Firebase Hosting: HTTPS forçado (automático)
- [ ] Alertas de erro configurados (Firebase Console → Alerting)

### Quando Escalar (>500 usuários)
- [ ] Ativar Firebase App Check para todas as Cloud Functions
- [ ] Adicionar DDoS protection (Firebase tem básico embutido)
- [ ] Revisar índices do Firestore (queries lentas = custo alto)
- [ ] Considerar Redis para cache de contexto do copilot

---

## 8. GESTÃO DE RECEITA

### Mercado Pago
- Webhook recebe notificações em: `https://us-central1-[PROJECT].cloudfunctions.net/handleMPWebhook`
- Verificar pagamentos recusados: MP Dashboard → Relatórios → Pagamentos Recusados
- Faturamento do mês: MP Dashboard → Início → Dinheiro disponível

### Assinaturas (Firestore)
- Cada usuário: `users/{uid}/subscription/main` → `{ plan, status, expiresAt }`
- Planos: `free`, `copiloto_monthly` (R$19,90), `copiloto_annual` (R$199,90)
- Cancelamentos: usuário perde acesso automaticamente após `expiresAt`

### MRR Atual (via Claude Code)
```
"Consulte o banco de dados do Firestore e calcule o MRR atual baseado nos usuários com plano pago"
```

### Reinvestimento de Revenue
- Mês 1: 0% em ads (crescimento orgânico)
- Quando MRR > R$300: investir 30% em Meta Ads
- Quando MRR > R$500: investir 40% em Meta Ads + 10% em Google Ads
- Escalar ROAS: target de R$5/cadastro, R$50/pagante

---

## 9. MARKETING — PROCESSOS SEMANAIS

### Instagram/TikTok @zegastao
**Frequência**: 3x/semana (Terça, Quinta, Sábado)

**Roteiros prontos** (adaptar conforme dados reais do app):

**Tipo 1 — Revelação de dado** (melhor para engajamento):
> "Fiz as contas aqui e descobri que quem tem R$5.000 de dívida no cartão a 12% ao mês, pagando só o mínimo, vai gastar R$18.000 no total. É isso que o Zé Gastão te mostra — a conta real que o banco não quer que você veja."

**Tipo 2 — Antes/Depois** (melhor para conversão):
> "Em [X] semanas usando o Zé Gastão: antes gastava R$800/mês em delivery sem saber. Agora sei e consigo cortar R$300/mês. Calcula: R$300 × 12 = R$3.600 no bolso por ano."

**Tipo 3 — Tutorial rápido** (melhor para retenção):
> Screen recording de 30s mostrando: importar extrato → ver categorias → falar com o copilot.

### UTMs em Todos os Links
Sempre usar UTMs para rastrear origem:
- Instagram bio: `?utm_source=instagram&utm_medium=bio&utm_campaign=perfil`
- TikTok: `?utm_source=tiktok&utm_medium=bio&utm_campaign=perfil`
- WhatsApp: `?utm_source=whatsapp&utm_medium=referral&utm_campaign=indicacao`
- Blog: `?utm_source=blog&utm_medium=cta&utm_campaign=[slug-do-post]`

### Google Search Console
- Verificar semanalmente: Performance → Consultas → ordenar por Cliques
- Posts de blog para otimizar primeiro: os com mais Impressões mas baixo CTR
- Meta: aparecer na 1ª página para "como sair das dívidas", "app finanças gratuito"

---

## 10. PROMPTS CLAUDE CODE PARA OPERAÇÃO

### Análise de Dados
```
"Analise os últimos 30 leads B2B no Firestore e me dê:
1. Quais segmentos têm mais interesse
2. Qual o follow-up que tenho pendente
3. Quais devo priorizar esta semana"
```

### Geração de Conteúdo
```
"Gere 5 ideias de post de blog sobre [tema] com:
- slug URL-friendly
- título que gera clique (não clickbait, mas intrigante)
- description de 160 chars com palavra-chave
- tom: amigo que entende de finanças, zona leste SP, sem jargão"
```

### Debugging
```
"Verifique os logs do Firebase Functions dos últimos 7 dias
e me informe: houve falhas? Quais funções? Quantas vezes?"
```

### Review de Conteúdo
```
"Revise este post de Instagram e ajuste para soar mais humano.
O público é: trabalhadores CLT e autônomos, 25-45 anos, SP.
Evite: palavras de coach/guru, frases longas, emojis excessivos."
```

### Atualização do App
```
"Implemente [funcionalidade] no Zé Gastão.
Stack: React 18, TypeScript, Firebase, Tailwind.
Padrão de código: ver src/components/*.tsx existentes.
Não adicione deps desnecessárias."
```

---

## 11. ROADMAP DE PRODUTO (90 DIAS)

### Mês 1 (Atual)
- [x] Blog SEO + painel admin
- [x] Copilot com fallback para novos usuários
- [x] Diagnóstico financeiro mobile corrigido
- [x] Toast feedback + setup checklist
- [ ] Notificações push (Firebase Cloud Messaging)
- [ ] Email nurture Day 1, 7, 21, 30

### Mês 2
- [ ] Simulador "E se eu pagar a mais?" nas dívidas
- [ ] Relatório mensal compartilhável (WhatsApp)
- [ ] Alerta de "tá gastando demais" por categoria
- [ ] Campanha Meta Ads (quando MRR > R$300)

### Mês 3
- [ ] PWA (Progressive Web App) — instalar como app nativo
- [ ] Open Finance: importação automática de extratos
- [ ] B2B: módulo para RH de empresas
- [ ] Programa de aceleração (InovAtiva Brasil, Cubo Itaú)

---

## 12. GESTÃO DE CRISE

### App Fora do Ar
1. Verificar Firebase Status: status.firebase.google.com
2. Se for deploy com erro: `firebase hosting:channel:list` → rollback
3. Se for functions: Firebase Console → Functions → Desativar temporariamente

### Dados de Usuário Comprometidos
1. Revogar tokens: Firebase Console → Authentication → Users → Disable
2. Comunicar usuários afetados por email
3. Fazer audit dos logs do Firestore

### Fatura Firebase Acima do Esperado
1. Firebase Console → Billing → ver o que está custando mais
2. Identificar: leituras excessivas de Firestore? Storage? Functions?
3. Solução mais comum: adicionar index no Firestore, cachear resultados

---

*Documento mantido por Claude Code. Atualizar após cada sprint.*
*Última atualização: Junho 2026*
