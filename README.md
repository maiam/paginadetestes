# Página de Testes — Base de autenticação Google OAuth 2.0

## Auditoria do projeto (estado encontrado)

- O repositório era **frontend-only** com **Vite + React + TypeScript**.
- Não havia backend Node/Express/Fastify/Next.
- Não havia autenticação real; apenas dados mockados no header.
- Não havia sessão/cookie/JWT implementado.
- Não havia banco de dados.
- Deploy no Render não estava estruturado para backend.

## Arquitetura implementada nesta etapa

### Visão geral

- Mantido o frontend React/Vite.
- Adicionado um backend Node (TypeScript) em `server/`.
- Fluxo OAuth 2.0 Authorization Code implementado no servidor.
- Sessão do app por cookie `HttpOnly` assinado.
- Tokens Google ficam apenas no backend (criptografados em repouso no arquivo local `data/auth-store.json`).

### Fluxo de login

1. Frontend chama `GET /api/auth/google/login`.
2. Backend gera `state`, salva em cookie assinado e redireciona ao Google.
3. Google retorna em `GET /api/auth/google/callback` com `code`.
4. Backend valida `state`, troca `code` por tokens, consulta `userinfo`.
5. Backend persiste usuário/tokens e cria sessão do app.
6. Frontend consulta `GET /api/auth/me` para refletir estado autenticado.

### Endpoints internos

- `GET /api/auth/google/login`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Segurança adotada

- `state` OAuth validado no callback.
- `client_secret` somente no backend.
- Cookie de sessão com `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Sessão assinada por HMAC.
- Tokens armazenados no backend e criptografados (AES-256-GCM).

## Configuração do Google Cloud

1. Abra [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto (ou selecione um existente).
3. Em **APIs & Services > OAuth consent screen**:
   - Configure nome do app, email de suporte e domínio.
   - Adicione escopos necessários (mínimo: `openid`, `profile`, `email`; e já pode manter calendar para próxima fase).
   - Adicione usuários de teste (enquanto estiver em Testing).
4. Em **Credentials > Create Credentials > OAuth client ID**:
   - Tipo: **Web application**.
   - Authorized redirect URIs:
     - Local: `http://localhost:8787/api/auth/google/callback`
     - Produção: `https://SEU-APP.onrender.com/api/auth/google/callback`

## Configuração no Render

1. Faça deploy deste repositório no Render.
2. Configure build/start:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start`
3. Defina variáveis de ambiente:
   - `NODE_ENV=production`
   - `PORT=10000` (ou padrão do Render)
   - `APP_BASE_URL=https://SEU-APP.onrender.com`
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `GOOGLE_OAUTH_REDIRECT_URI=https://SEU-APP.onrender.com/api/auth/google/callback`
   - `SESSION_SECRET=<valor longo e aleatório>`
   - `GOOGLE_OAUTH_SCOPES=openid profile email https://www.googleapis.com/auth/calendar`

> Observação: a persistência atual em arquivo funciona para base inicial, mas para produção robusta/multi-instância recomenda-se migrar para Postgres/Redis na próxima etapa.

## Execução local

1. Copie `.env.example` para `.env` e preencha credenciais Google.
2. Instale dependências:
   ```bash
   npm ci
   ```
3. Execute:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:5173`.

## Scripts

- `npm run dev` — sobe backend (8787) + frontend Vite (5173)
- `npm run build` — build frontend + compilação backend
- `npm run start` — inicia backend compilado (produção)
