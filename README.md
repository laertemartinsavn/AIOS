# AIOS

Sistema operacional de IA — MVP para ler transcrições de calls, gerar relatórios e propostas comerciais.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres)
- Zod (validação)
- Docker / Easypanel para deploy

## Arquitetura do backend

```
HTTP (Route Handler)  →  Service  →  Repository  →  Supabase
        ↑
   Proxy/Middleware (Auth via cookie Supabase)
```

Estrutura:
```
src/
  app/
    (auth)/         páginas de login, cadastro, sair
    (app)/          páginas protegidas (dashboard)
    api/            route handlers
  lib/
    config/         validação de env vars
    supabase/       clients server/browser/middleware
    auth/           requireUser helper
    errors/         AppError + helper HTTP
    validators/     schemas Zod por entidade
    repositories/   acesso ao banco por entidade
    services/       regras de negócio por entidade
    types/          tipos do banco e de domínio
  proxy.ts          proxy global (refresh de sessão + proteção de rotas)
supabase/
  migrations/       SQL inicial
docker/             Dockerfile
```

## Setup local

1. Copie env vars:
   ```bash
   cp .env.example .env.local
   ```
2. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do seu projeto Supabase (Dashboard → Project Settings → API).
3. Aplique a migration no Supabase (via SQL Editor do Dashboard, ou Supabase CLI):
   ```bash
   # via SQL Editor: cole o conteúdo de supabase/migrations/0001_init.sql
   ```
4. Instale e rode:
   ```bash
   npm install
   npm run dev
   ```
5. Acesse http://localhost:3000

## Deploy no Easypanel

1. **Criar App** apontando para este repositório.
2. **Build:** Docker, dockerfile path `docker/Dockerfile`.
3. **Build Args** (necessários pois `NEXT_PUBLIC_*` são inlined no bundle):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Environment Variables** do serviço (runtime):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opcional, só se for usar jobs admin)
5. **Porta:** 3000.
6. **Domínio:** configure no painel do Easypanel; HTTPS automático.

## API

Todas as rotas exigem sessão Supabase válida (cookie). Erro padrão: `{ error: { code, message, details? } }`.

| Método | Rota                       | Descrição                          |
|--------|----------------------------|------------------------------------|
| GET    | `/api/chamadas`            | lista chamadas do usuário          |
| POST   | `/api/chamadas`            | cria chamada                       |
| GET    | `/api/chamadas/[id]`       | retorna chamada                    |
| PATCH  | `/api/chamadas/[id]`       | atualiza chamada                   |
| DELETE | `/api/chamadas/[id]`       | remove chamada (cascade)           |
| GET    | `/api/transcricoes?chamada_id=...` | lista transcrições        |
| POST   | `/api/transcricoes`        | cria transcrição                   |
| ...    | (mesmo padrão)             | relatórios, propostas              |

## TODOs (próximas iterações)

- [ ] Geração de relatório por IA a partir da transcrição (`src/lib/services/relatorios.service.ts`)
- [ ] Geração de proposta + link externo (`src/lib/services/propostas.service.ts`)
- [ ] UI para listar e criar entidades via dashboard
- [ ] Testes automatizados (unit + integration)

## Spec e plano

- Spec: `docs/superpowers/specs/2026-05-12-aios-design.md`
- Plano: `docs/superpowers/plans/2026-05-13-aios-scaffold.md`