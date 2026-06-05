# CLAUDE.md

<!-- claude-context: minimal -->
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What This Is

AIOS is an MVP SaaS for B2B sales intelligence. It ingests call transcriptions, runs AI analysis to extract structured KPIs, and generates commercial proposals. Everything is in Portuguese (pt-BR) — UI strings, Zod error messages, and AI system prompts.

## Commands

```bash
npm run dev      # Dev server on :3000
npm run build    # Production build (standalone output)
npm run lint     # ESLint 9 flat config
```

No test suite exists. There is no `test` script.

## Stack

- **Next.js 16.2.6** (App Router) + React 19 + TypeScript 5 — see AGENTS.md warning
- **Supabase** — Postgres + Auth (OAuth only, no password flow)
- **Anthropic SDK `^0.95.2`** — Claude Sonnet 4.6 for analysis and proposal generation
- **Tailwind CSS v4** + PostCSS (no CSS-in-JS)
- **Zod v4** for validation (breaking changes from v3 — check docs before using)
- **Base UI React** for accessible primitives; shadcn-style component structure (built locally, no shadcn package at runtime)

## Environment Variables

Copy `.env.example` → `.env.local`. Required:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # without this, AI features fail with a clear error
```

All vars are Zod-validated at startup in [src/lib/config/env.ts](src/lib/config/env.ts) — the app won't start if required vars are missing.

## Architecture

### Layer Separation

```
Route Handler (app/api/**)
  → requireUser()           # extracts Supabase user + client from cookies
  → Service (lib/services/) # business logic, validation, orchestration
  → Repository (lib/repositories/) # Supabase queries only, no logic
```

Services call repos and the Anthropic client. Route handlers call services and return `NextResponse`. Never put Supabase queries in route handlers; never put business logic in repos.

### Auth

`src/proxy.ts` is the Next.js 16 middleware (Next.js 16 renamed `middleware.ts` → `proxy.ts`). It exports `proxy` and `config` and is picked up automatically by the framework. It runs `updateSession()` on every request to refresh Supabase cookies, then redirects unauthenticated users to `/login`. Public paths: `/`, `/login`, `/cadastro`, `/api/auth/*`. **Do NOT create a `middleware.ts` file — it conflicts with `proxy.ts` in Next.js 16.**

`requireUser()` in [src/lib/auth/require-user.ts](src/lib/auth/require-user.ts) is used at the top of every route handler to get the current user and a scoped Supabase client.

### Error Handling

Use `AppError` from [src/lib/errors/app-error.ts](src/lib/errors/app-error.ts) with typed codes (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`). Route handlers catch it and call `errorResponse()` which serializes to `{ error: { code, message, details } }`. In dev, full stack traces are returned.

### AI Integration

Both AI flows live in [src/lib/ia/](src/lib/ia/):

- `analisar-call.ts` — extracts structured KPIs from a transcript using Anthropic tool_choice (forced single tool call)
- `gerar-proposta.ts` — generates a proposal from the analysis report + original transcript

Both use `cache_control: { type: "ephemeral" }` on system prompts for cost optimization. Model is hardcoded to `claude-sonnet-4-6`. The `effort: "medium"` setting is set via `output_config`.

### Data Model Key Facts

`relatorios` and `propostas` each have two column sets from two migrations:
- `0001_init.sql`: core fields + narrative `conteudo` (text/markdown)
- `0002_kpis.sql`: structured nullable KPI fields (BANT, sentimento, dores, objecoes, etc.)

All KPI fields are nullable — the AI only fills what it can safely extract. Missing fields signal gaps in the call quality.

RLS policies enforce per-user data isolation: users only access their own `chamadas`; `transcricoes`/`relatorios`/`propostas` are checked transitively through `chamada.user_id`.

Deleting a call cascades to all related transcricoes, relatorios, and propostas.

### Route Conventions

Protected pages live under `src/app/(app)/` and use:
```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```
This ensures fresh data on every request — no stale cache.

The main composite action is `POST /api/chamadas/com-analise` which creates a call + transcription + runs AI analysis in one shot.

### Path Alias

`@/*` maps to `src/*` throughout (tsconfig paths).
