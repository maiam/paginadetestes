# Página de Testes — Frontend/Backend separados

## Estrutura

```text
/
├─ frontend/            # React + Vite + TypeScript
│  ├─ src/
│  ├─ public/
│  ├─ package.json
│  └─ ...
├─ backend/             # Node.js + TypeScript (API/OAuth)
│  ├─ src/
│  ├─ package.json
│  ├─ .env.example
│  └─ ...
├─ package.json         # scripts de orquestração
├─ .gitignore
└─ README.md
```

## Rodando localmente

### 1) Instalar dependências

```bash
npm ci --prefix frontend
npm ci --prefix backend
```

### 2) Variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Preencha as credenciais Google no `backend/.env`.

### 3) Desenvolvimento

Rodar os dois serviços:

```bash
npm run dev
```

Ou separadamente:

```bash
npm run dev:frontend
npm run dev:backend
```

## Build

```bash
npm run build
```

## Deploy no Render (separado)

### Frontend service

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Env opcional: `VITE_API_BASE_URL=https://SEU-BACKEND.onrender.com`

### Backend service

- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`
- Env vars:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `FRONTEND_BASE_URL=https://SEU-FRONTEND.onrender.com`
  - `GOOGLE_CLIENT_ID=...`
  - `GOOGLE_CLIENT_SECRET=...`
  - `GOOGLE_OAUTH_REDIRECT_URI=https://SEU-BACKEND.onrender.com/api/auth/google/callback`
  - `SESSION_SECRET=...`
  - `GOOGLE_OAUTH_SCOPES=openid profile email https://www.googleapis.com/auth/calendar`

## Próximo passo (OAuth/Calendar)

A estrutura do backend já está pronta para evoluir com módulos dedicados em `backend/src`, por exemplo:

- `backend/src/auth/*`
- `backend/src/google/*`
- `backend/src/calendar/*`
