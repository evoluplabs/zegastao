# Checklist de Migração de Conta GitHub

> Criado para auxiliar na transferência do repositório para outra conta GitHub.
> **Apague este arquivo após concluir a migração.**

---

## 1. Transferir o repositório

1. Abra o repositório na conta atual (`alvedev/zegastao`)
2. **Settings** → role até o final → **Danger Zone**
3. Clique em **Transfer repository**
4. Informe o nome da nova conta/organização de destino
5. Confirme digitando `alvedev/zegastao`

> O GitHub cria redirect automático da URL antiga para a nova. Clones e pushes existentes continuam funcionando.

---

## 2. Secrets do GitHub Actions (recriar manualmente)

Na nova conta: **Settings → Secrets and variables → Actions → New repository secret**

### Firebase — configuração do frontend (build)

| Secret | Onde pegar |
|--------|-----------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps → SDK setup |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_STORAGE_BUCKET` | idem |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |
| `VITE_FIREBASE_MEASUREMENT_ID` | idem |

### Firebase — deploy via CI/CD

| Secret | Onde pegar |
|--------|-----------|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General → **Project ID** |
| `FIREBASE_TOKEN` | Execute `firebase login:ci` no terminal e copie o token gerado |

> O token do `firebase login:ci` pode expirar. Se o deploy falhar com erro de autenticação, gere um novo.

### Integrações externas

| Secret | Onde pegar |
|--------|-----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `MP_ACCESS_TOKEN` | Mercado Pago Developers → Credenciais → **Access Token** |
| `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks → secret configurado no painel |
| `SENTRY_DSN` | sentry.io → Settings → Projects → seu projeto → Client Keys → DSN |
| `VITE_SENTRY_DSN` | mesmo valor do `SENTRY_DSN` acima |

**Total: 14 secrets para recriar.**

---

## 3. O que migra automaticamente (nenhuma ação necessária)

- Todo o código, branches e histórico de commits
- Issues e Pull Requests
- Arquivo `.github/workflows/deploy.yml`
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`

---

## 4. O que NÃO muda (independente do GitHub)

- O projeto Firebase continua o mesmo — não precisa recriar nada lá
- As Cloud Functions continuam rodando normalmente
- O domínio de produção (Firebase Hosting) não é afetado

---

## 5. Configurar Claude Code na Web com o novo repositório

Após a transferência, ao abrir uma nova sessão do Claude Code na Web:
- Autorize o acesso ao repositório na nova conta GitHub
- A sessão vai apontar automaticamente para o novo endereço do repo

---

## 6. Verificação final após migração

- [ ] Todos os 14 secrets cadastrados na nova conta
- [ ] Push de teste no branch `main` disparou o workflow de deploy com sucesso
- [ ] Firebase Hosting servindo a versão mais recente
- [ ] Cloud Functions respondendo normalmente
- [ ] Login/autenticação funcionando no app
- [ ] Este arquivo (`MIGRATION.md`) removido do repositório
