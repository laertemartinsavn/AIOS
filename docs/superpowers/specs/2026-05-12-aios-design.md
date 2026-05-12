# AIOS — Design da Estrutura Inicial

**Data:** 2026-05-12
**Status:** Aprovado (aguardando review da spec antes do plano de implementação)

## 1. Visão Geral

AIOS é um sistema web cujo MVP recebe transcrições de calls **coladas manualmente em um campo de texto**, gera um relatório sobre a call e cria uma proposta comercial com link externo.

Esta spec cobre **apenas a estrutura inicial** (scaffold): autenticação, organização do backend, schema das entidades de domínio e preparação para deploy. As integrações reais (geração de relatório por IA, geração de proposta) ficam como TODOs claramente marcados no código. Integração com Google Drive está fora do MVP atual.

## 2. Stack Técnica

- **Next.js 15** com App Router e TypeScript
- **Tailwind CSS** para as telas mínimas de auth/dashboard
- **Supabase** — Auth + Postgres, via `@supabase/ssr` (cookies/SSR)
- **Zod** para validação de input HTTP e de variáveis de ambiente
- **Docker** multi-stage (Next standalone output)
- **Easypanel** como plataforma de deploy
- Domínio nomeado em português (`chamadas`, `transcricoes`, `relatorios`, `propostas`); framework/código em inglês padrão

## 3. Arquitetura do Backend

Três camadas explícitas, com responsabilidades isoladas:

```
HTTP (Route Handler)  →  Service  →  Repository  →  Supabase
        ↑
   Middleware de Auth (sessão por cookie)
```

- **Route Handler** (`app/api/<entidade>/route.ts`): valida input com Zod, chama service, formata resposta HTTP. Sem regra de negócio.
- **Service** (`lib/services/<entidade>.service.ts`): orquestra regras de negócio, combina repositories, lança `AppError` semântico.
- **Repository** (`lib/repositories/<entidade>.repo.ts`): único ponto de contato com o Supabase para aquela entidade. Recebe um cliente Supabase já autenticado.
- **Auth middleware**: middleware global do Next.js faz refresh do token Supabase em cada request. Para API routes, helper `requireUser()` retorna 401 se não houver sessão.

Benefícios: cada arquivo tem uma responsabilidade, troca de DB/auth no futuro fica localizada, testes unitários do service não precisam tocar HTTP.

## 4. Estrutura de Pastas

```
src/
  app/
    (auth)/
      login/page.tsx
      cadastro/page.tsx
      sair/route.ts
    (app)/
      dashboard/page.tsx            # protegida
    api/
      auth/callback/route.ts        # callback do Supabase (confirmação de email / OAuth futuro)
      chamadas/route.ts             # GET (list), POST (create)
      chamadas/[id]/route.ts        # GET, PATCH, DELETE
      transcricoes/route.ts
      transcricoes/[id]/route.ts
      relatorios/route.ts
      relatorios/[id]/route.ts
      propostas/route.ts
      propostas/[id]/route.ts
    layout.tsx
    page.tsx                        # landing simples / redireciona
    globals.css
  lib/
    supabase/
      server.ts                     # client para Server Components / Route Handlers
      client.ts                     # client para Client Components
      middleware.ts                 # helper de refresh de sessão
    auth/
      require-user.ts               # guard de API; retorna { user, supabase } ou 401
    services/
      chamadas.service.ts
      transcricoes.service.ts
      relatorios.service.ts
      propostas.service.ts
    repositories/
      chamadas.repo.ts
      transcricoes.repo.ts
      relatorios.repo.ts
      propostas.repo.ts
    validators/
      chamadas.schema.ts            # schemas Zod (create/update)
      transcricoes.schema.ts
      relatorios.schema.ts
      propostas.schema.ts
    errors/
      app-error.ts                  # AppError + helper http()
    config/
      env.ts                        # validação Zod das env vars; importado no boot
    types/
      database.types.ts             # gerado: `supabase gen types typescript`
      entities.ts                   # tipos de domínio (re-exports + tipos derivados)
  middleware.ts                     # middleware Next.js: refresh sessão + proteger rotas
supabase/
  migrations/
    0001_init.sql                   # schema das 4 entidades + RLS
  config.toml                       # opcional, gerado pelo Supabase CLI
docker/
  Dockerfile
.dockerignore
.env.example
.gitignore
README.md
next.config.ts
tsconfig.json
package.json
```

## 5. Schema do Banco de Dados

Todas as tabelas em snake_case; PK `id uuid default gen_random_uuid()`; `created_at timestamptz default now()`.

### `chamadas`
| coluna       | tipo                                              |
|--------------|---------------------------------------------------|
| id           | uuid PK                                           |
| user_id      | uuid → auth.users(id) ON DELETE CASCADE           |
| titulo       | text NOT NULL                                     |
| status       | text DEFAULT 'pendente'                           |
| created_at   | timestamptz DEFAULT now()                         |

### `transcricoes`
| coluna       | tipo                                              |
|--------------|---------------------------------------------------|
| id           | uuid PK                                           |
| chamada_id   | uuid → chamadas(id) ON DELETE CASCADE             |
| conteudo     | text NOT NULL                                     |
| created_at   | timestamptz DEFAULT now()                         |

### `relatorios`
| coluna       | tipo                                              |
|--------------|---------------------------------------------------|
| id           | uuid PK                                           |
| chamada_id   | uuid → chamadas(id) ON DELETE CASCADE             |
| conteudo     | text NOT NULL                                     |
| gerado_em    | timestamptz DEFAULT now()                         |

### `propostas`
| coluna       | tipo                                              |
|--------------|---------------------------------------------------|
| id           | uuid PK                                           |
| chamada_id   | uuid → chamadas(id) ON DELETE CASCADE             |
| link_externo | text NOT NULL                                     |
| status       | text DEFAULT 'rascunho'                           |
| created_at   | timestamptz DEFAULT now()                         |

### RLS
- RLS habilitado em todas as 4 tabelas.
- `chamadas`: política `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE.
- `transcricoes`, `relatorios`, `propostas`: política `EXISTS (SELECT 1 FROM chamadas WHERE chamadas.id = <tabela>.chamada_id AND chamadas.user_id = auth.uid())`.

## 6. Autenticação

- **Estratégia:** email + senha via Supabase Auth (suficiente para MVP). OAuth/Google fica como evolução natural.
- **Cookies:** `@supabase/ssr` gerencia a sessão em cookies httpOnly.
- **`middleware.ts` (raiz):** chama `updateSession()` em todo request; se rota for `(app)/*` ou `/api/*` (exceto `/api/auth/*`) e não houver sessão → redireciona/401.
- **`requireUser()`:** helper usado em Route Handlers de API; retorna `{ user, supabase }` ou lança erro 401.
- **RLS** continua sendo a fonte de verdade no banco; o middleware é uma trava extra na borda HTTP.

## 7. Contratos das APIs (padrão CRUD por entidade)

Exemplo `chamadas` (as outras seguem o mesmo padrão, ajustando campos):

| Método | Rota                  | Descrição                                     |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/api/chamadas`       | lista chamadas do usuário                     |
| POST   | `/api/chamadas`       | cria chamada (body validado por Zod)          |
| GET    | `/api/chamadas/[id]`  | retorna uma chamada                           |
| PATCH  | `/api/chamadas/[id]`  | atualização parcial                           |
| DELETE | `/api/chamadas/[id]`  | remove (cascade nas entidades filhas)         |

**Formato de erro padronizado:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

## 8. Frontend Mínimo

- `/` — landing simples; se logado, redireciona para `/dashboard`.
- `/login` — formulário email/senha → `supabase.auth.signInWithPassword`.
- `/cadastro` — formulário email/senha → `supabase.auth.signUp`.
- `/sair` — Route Handler que faz signOut e redireciona.
- `/dashboard` — placeholder "Olá, {email}. Em breve..."; mostra que a auth funciona.

Sem styling sofisticado — Tailwind básico, formulários funcionais. Foco em provar o fluxo.

## 9. Configuração de Ambiente

`.env.example` documenta:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`lib/config/env.ts` valida com Zod no boot. Se faltar variável, app falha cedo com mensagem clara em vez de erro obscuro em runtime.

`SUPABASE_SERVICE_ROLE_KEY` é usada apenas em contextos server-side específicos (ex: jobs administrativos futuros). O fluxo padrão usa o anon key + sessão do usuário.

## 10. Docker + Easypanel

### Dockerfile
- Multi-stage: `deps` → `builder` → `runner`
- Base: `node:20-alpine`
- `next.config.ts` com `output: 'standalone'` para imagem enxuta
- Roda como usuário não-root
- Porta `3000` exposta

### Easypanel
README documenta passo a passo:
1. Criar App apontando para o repositório (Dockerfile build)
2. Definir env vars (Supabase URL/keys)
3. Domínio + HTTPS automático do Easypanel
4. Health check em `/` (200)

A criação efetiva do serviço fica para a próxima sessão quando o usuário fornecer credenciais.

## 11. O Que Fica Como TODO Para a Próxima Sessão

Marcado no código com `// TODO(integração):` e listado no README:
1. **Credenciais Supabase** → rodar migrations, conectar app, testar auth end-to-end.
2. **Credenciais Easypanel** → criar service, configurar env vars, deploy.
3. **Geração de relatório por IA** → service `relatorios` tem placeholder.
4. **Geração de proposta + link externo** → service `propostas` tem placeholder.

## 12. Fora de Escopo (Não-Goals)

- Lógica real de IA (geração de relatório/proposta).
- Integração com Google Drive (transcrição vem por colagem manual no MVP).
- Sistema de billing/planos.
- Painel administrativo / multi-tenant.
- Testes automatizados (virão na fase de implementação de cada feature).
- i18n — UI fica em português hard-coded por enquanto.
