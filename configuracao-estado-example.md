# Estado da Configuração do AIOS

> **Atualizado em:** _(preencher a cada mudança)_
> **Última ação:** _(o que foi feito por último)_
> **Próximo passo:** _(o que falta — quem faz e o quê)_

> **Nota:** este arquivo é **local de cada instalação** (não commitado). Ele registra onde sua sessão de IA parou. Ao clonar o template, copie este arquivo:
>
> ```bash
> cp configuracao-estado-example.md configuracao-estado.md
> ```
>
> Depois siga as instruções abaixo.

---

## Como uma sessão de IA deve usar este arquivo

1. Ler o cabeçalho acima → entende o contexto.
2. Procurar o primeiro `[ ]` na ordem dos estágios → é o próximo passo.
3. Abrir `configuracao.md` na seção do estágio correspondente.
4. Executar. Ao concluir um item, **marcar `[x]` e atualizar o cabeçalho** ("Última ação" + "Próximo passo").
5. Adicionar entrada no **Histórico** ao final deste arquivo.
6. Commitar **apenas em commits locais do cliente** (este arquivo está em `.gitignore` do template; cada instalação mantém seu próprio histórico).

Se um passo bloquear (ex: cliente não tem credencial pronta), deixar `[ ]` mas **atualizar "Próximo passo"** explicando o bloqueio.

---

## Checklist

### Estágio 0 — Scaffold (já pronto no template ao clonar)
- [x] Spec do design (`docs/superpowers/specs/2026-05-12-aios-design.md`)
- [x] Plano de implementação (`docs/superpowers/plans/2026-05-13-aios-scaffold.md`)
- [x] Bootstrap Next.js 16 + Tailwind v4 + TypeScript
- [x] Dependências Supabase + Zod instaladas
- [x] Camada de auth (proxy + requireUser)
- [x] 4 entidades de domínio (validator + repo + service + routes)
- [x] Migration SQL com RLS
- [x] Páginas de auth (login/cadastro/sair/callback) + dashboard placeholder
- [x] Dockerfile multi-stage
- [x] README com setup e deploy
- [x] Code review final aplicado (fixes de open-redirect, DELETE 404, layout metadata)

### Estágio 1 — Supabase configurado pela IA (via MCP)
- [ ] MCP `claude_ai_Supabase` ativo na sessão do cliente (`list_organizations` funciona)
- [ ] Cliente decidiu: projeto existente OU criar novo (com nome + região)
- [ ] Cliente decidiu: "Confirm email" ligado ou desligado (registrar em "Decisões")
- [ ] *(Opcional)* Personal Access Token (PAT) recebido pra automatizar Auth config
- [ ] `project_id` identificado ou novo projeto criado (`ACTIVE_HEALTHY`)
- [ ] Migration `0001_init.sql` aplicada via `apply_migration`
- [ ] `list_tables` confirma 4 tabelas + `rowsecurity = true` em todas
- [ ] Email Auth habilitado (via PAT ou cliente no Dashboard)
- [ ] Redirect URL `http://localhost:3000/api/auth/callback` adicionada
- [ ] `database.types.ts` regenerado via `generate_typescript_types` e commitado
- [ ] `get_advisors` (security + performance) sem alertas críticos
- [ ] URL + publishable key entregues ao cliente pro Estágio 2

### Estágio 2 — App rodando local
- [ ] `.env.local` criado e preenchido
- [ ] `npm install` executado
- [ ] `npm run dev` levanta sem erro
- [ ] Cadastro funciona via UI
- [ ] Login funciona via UI
- [ ] Dashboard exibe email do usuário logado
- [ ] Sair redireciona pra `/login`
- [ ] `GET /api/chamadas` autenticado → `{ data: [] }`
- [ ] `GET /api/chamadas` sem auth → 401 com JSON de erro

### Estágio 3 — Easypanel configurado pela IA (via API)
- [ ] Credenciais recebidas (URL do painel + API token)
- [ ] Nome do projeto, repo git e domínio definidos com cliente
- [ ] Repositório git acessível ao Easypanel (deploy key/PAT do provider configurado)
- [ ] Formato da API descoberto (tRPC moderna vs `/api/v1/*`)
- [ ] Projeto criado no painel via API
- [ ] Service "app" criado com source git + Dockerfile (`docker/Dockerfile`)
- [ ] Build Args setados (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Env vars de runtime setadas
- [ ] Porta 3000 exposta
- [ ] Domínio mapeado com HTTPS provisionado
- [ ] Configuração validada via GET no service

### Estágio 4 — Deploy ativo
- [ ] Redirect URL de produção adicionada no Supabase
- [ ] Deploy disparado
- [ ] Build concluído sem erro (logs revisados)
- [ ] HTTPS respondendo no domínio
- [ ] Cadastro funciona em produção
- [ ] Login funciona em produção
- [ ] Dashboard funciona em produção
- [ ] API `GET /api/chamadas` funciona em produção (autenticado)

### Pós-deploy — Features de IA (fora deste playbook)
- [ ] Credenciais Anthropic/OpenAI recebidas
- [ ] Geração de relatório implementada (service `relatorios`)
- [ ] Geração de proposta + link externo (service `propostas`)
- [ ] UI no dashboard pra criar chamadas + colar transcrição

---

## Decisões registradas

Anote aqui escolhas feitas com o cliente que afetam configuração:

- *(vazio — primeira decisão aparece quando começarmos Estágio 1)*

---

## Histórico

- *(vazio — primeira entrada aparece quando começarmos Estágio 1)*
