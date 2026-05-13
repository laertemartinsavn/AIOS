# Configuração do AIOS — Playbook

> **Este é um projeto base / template.** Cada cliente que quer rodar o AIOS clona este repositório e executa este playbook com uma sessão de IA (Claude) assistindo. A IA opera duas plataformas em nome do cliente:
>
> - **Supabase** — via **MCP** instalado pelo cliente na sua sessão Claude (`claude_ai_Supabase`). A IA aplica migration, configura auth, regera tipos. O cliente não toca em SQL Editor nem copia chaves.
> - **Easypanel** — via **API HTTP** com token fornecido pelo cliente. A IA cria projeto, service, build args, env vars e dispara deploy.

**Use sempre junto com `configuracao-estado.md`** — esse outro arquivo registra o que já foi feito e qual o próximo passo. Ele é **local de cada instalação** (gitignored). Ao clonar o template pela primeira vez, copie o exemplo:

```bash
cp configuracao-estado-example.md configuracao-estado.md
```

Uma sessão de IA retomando a instalação deve:

1. Ler `configuracao-estado.md` primeiro pra ver onde paramos.
2. Identificar o próximo item `[ ]` (não feito).
3. Executar conforme a seção correspondente neste arquivo.
4. **Marcar `[x]` em `configuracao-estado.md`** e atualizar "Próximo passo" + "Última ação".
5. Commitar **apenas em commits locais do cliente** (esse arquivo não vai para o template upstream).

---

## Credenciais a pedir ao cliente

A IA pede apenas o necessário pra cada estágio. Não pedir tudo no início — o cliente pode ainda não ter o domínio ou conta Easypanel quando começar.

### Bloco A — Supabase (necessário a partir do Estágio 1)

**Pré-requisito do cliente:** instalar o **MCP do Supabase no Claude** (uma vez, antes da primeira sessão de configuração). Passo a passo:

1. Cliente vai a https://claude.ai → **Settings → Connectors**.
2. **Add custom connector** → escolher Supabase (ou instalar via marketplace de MCPs).
3. Fazer login na conta Supabase quando solicitado.
4. Confirmar que o MCP aparece como ativo (`claude_ai_Supabase`).

> **Verificação:** na próxima conversa com a IA, ela deve conseguir rodar `list_organizations` e ver as orgs do cliente. Se não conseguir, o MCP não está conectado nessa sessão — pedir pro cliente conferir Settings.

Com o MCP ativo, a IA tem acesso a: `list_projects`, `apply_migration`, `list_tables`, `generate_typescript_types`, `get_advisors`, `get_publishable_keys`, `get_project_url`, `execute_sql`, `create_project`, e mais.

O cliente só precisa decidir/informar:

1. **Usar projeto existente ou criar novo?**
   - Existente: cliente diz o **nome ou ref** do projeto. A IA confirma via `list_projects`.
   - Novo: cliente decide **nome** e **região** (ex: `sa-east-1` São Paulo). IA chama `get_cost` → `confirm_cost` → `create_project`.

2. **"Confirm email" no Auth ligado ou desligado?**
   - Desligado: signup já loga direto (bom pra MVP/demo).
   - Ligado: usuário precisa confirmar pelo email (recomendado pra produção).

*Opcionalmente,* se o cliente quiser **automação total da configuração do Auth provider** (atualmente o MCP do Supabase não cobre Auth → Providers → Email config nem Redirect URLs), ele pode gerar um **Personal Access Token (PAT)** em Dashboard → **Account → Access Tokens** e fornecer pra IA. Sem o PAT, esses 2 cliques ficam manuais no Dashboard do cliente.

### Bloco A.1 — Fallback sem MCP (raro)

Se por algum motivo o cliente não puder instalar o MCP, a IA pode operar via API HTTP usando chaves manuais. Nesse caso, pedir:

| Valor | Formato | Onde achar |
|---|---|---|
| **Project URL** | `https://<ref>.supabase.co` | Dashboard → Project Settings → API |
| **Publishable key** | `sb_publishable_...` | Mesmo lugar (substitui `anon` legada) |
| **Secret key** | `sb_secret_...` | Mesmo lugar, "Reveal" — **canal seguro: nunca chat público** |

Migration vai via `psql -h db.<ref>.supabase.co -U postgres -f supabase/migrations/0001_init.sql` (senha = secret key). Tipos via `npx supabase gen types`. Demais passos seguem o Estágio 1 com adaptações HTTP.

### Bloco B — Easypanel (necessário a partir do Estágio 3)

1. **URL do painel** — ex: `https://panel.cliente.com`.
2. **API token** — Easypanel → **Settings → API → Create token**. Permissões: criar projeto, criar service, definir env vars, deploy.
3. **Nome do projeto** desejado no painel (ex: `aios`).
4. **Repositório git** acessível ao Easypanel (URL HTTPS ou SSH). Se privado, deploy key/PAT do provider.
5. **Domínio público** — ex: `aios.cliente.com`. HTTPS automático.

### Bloco C — Provedor de IA (fora do scaffold inicial)

Anthropic API key ou OpenAI API key quando o cliente decidir habilitar geração de relatório/proposta.

---

## Estágio 1 — Supabase configurado pela IA (via MCP)

**Pré-requisito:** MCP `claude_ai_Supabase` ativo na sessão do cliente + decisões do Bloco A (projeto existente/novo + Confirm email sim/não) + opcionalmente PAT.

### Passos da IA

1. **Confirmar acesso ao MCP.** Rode `list_organizations`. Espere ver a org do cliente. Se falhar, instruir cliente a conferir Settings → Connectors do Claude.

2. **Identificar / criar projeto.**
   - Existente: `list_projects` → achar pelo nome/ref informado pelo cliente. Anotar `project_id`.
   - Novo: `get_cost(type:"project", organization_id)` → comunicar valor ao cliente → `confirm_cost(...)` recebendo o `confirm_cost_id` → `create_project(name, region, organization_id, confirm_cost_id)`. Aguardar status `ACTIVE_HEALTHY` (pode levar alguns minutos; rechecar com `get_project`).

3. **Aplicar a migration.**
   ```
   apply_migration(
     project_id,
     name: "init",
     query: <conteúdo de supabase/migrations/0001_init.sql>
   )
   ```

4. **Verificar tabelas.** `list_tables(project_id, schemas: ["public"], verbose: false)`. Espere ver `chamadas`, `transcricoes`, `relatorios`, `propostas`. Pra confirmar RLS, fazer `verbose: true` ou rodar `execute_sql("select tablename, rowsecurity from pg_tables where schemaname='public'")` e confirmar `rowsecurity = true` em todas.

5. **Configurar Email Auth.**
   - **Com PAT do cliente:**
     ```bash
     curl -X PATCH https://api.supabase.com/v1/projects/<ref>/config/auth \
       -H "Authorization: Bearer <PAT>" -H "Content-Type: application/json" \
       -d '{"external_email_enabled": true, "mailer_autoconfirm": <true|false>}'
     ```
     `mailer_autoconfirm: true` = "Confirm email" **desligado** (signup loga direto). `false` = ligado.

   - **Sem PAT:** instruir cliente a abrir Dashboard → **Authentication → Providers → Email** → habilitar + configurar Confirm email conforme decisão. Levar ~30 segundos.

6. **Adicionar Redirect URL de localhost.**
   - **Com PAT:** mesmo endpoint, campo `uri_allow_list` adicionar `http://localhost:3000/api/auth/callback`.
   - **Sem PAT:** instruir cliente em Dashboard → **Authentication → URL Configuration → Redirect URLs** → adicionar.

7. **Regenerar tipos TypeScript.**
   ```
   generate_typescript_types(project_id)
   ```
   Salvar o resultado em `src/lib/types/database.types.ts` (sobrescrevendo o stub) e commitar:
   ```bash
   git add src/lib/types/database.types.ts
   git commit -m "feat(types): regenera database.types do schema do cliente"
   ```

8. **Rodar advisors.**
   ```
   get_advisors(project_id, type: "security")
   get_advisors(project_id, type: "performance")
   ```
   Resolver alertas críticos antes de seguir. Reportar warnings ao cliente com link de remediação.

9. **Pegar URL e publishable key** pra preparar o `.env.local` do Estágio 2:
   ```
   get_project_url(project_id)
   get_publishable_keys(project_id)
   ```
   Anotar os valores (não commitar). Entregar ao cliente prontos pra colar.

### Critério de pronto
- 4 tabelas presentes em `public` com `rowsecurity = true`.
- Email Auth habilitado, decisão sobre Confirm email registrada em `configuracao-estado.md`.
- Redirect URL de localhost configurada.
- `database.types.ts` regenerado e commitado.
- Sem alertas críticos nos advisors.
- URL + publishable key entregues ao cliente.

---

## Estágio 2 — App rodando local

**Pré-requisito:** Estágio 1 completo.

### O que o cliente faz

1. **Receber da IA** a URL e a publishable key prontas pra colar.

2. **Criar `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```
   Preencher:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<URL fornecida pela IA>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_... — apesar do nome legado da variável, é a publishable nova>
   # SUPABASE_SERVICE_ROLE_KEY=<sb_secret_...>  ← só se for usar jobs admin server-side; cuidado: nunca expor no client
   ```

   > Nota: as variáveis no app mantêm os nomes `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para compatibilidade com `@supabase/ssr` — o **valor** colocado em `_ANON_KEY` agora é a publishable key nova.

3. **Instalar e rodar:**
   ```bash
   npm install
   npm run dev
   ```
   Abrir http://localhost:3000.

4. **Smoke test do fluxo:**
   - `/` → **Criar conta** → email + senha (≥6 chars).
   - Se Confirm Email ligado, confirmar no email.
   - `/dashboard` → vê `Olá, <email>`.
   - **Sair** → volta pra `/login`.

5. **Smoke test da API:**
   - Logado: http://localhost:3000/api/chamadas → `{"data":[]}`.
   - Sem cookie (curl novo) → 401 com JSON de erro.

### Critério de pronto
- Cadastro + login + dashboard + sair funcionam.
- API retorna 401 sem sessão e `{ data: [] }` com sessão.

---

## Estágio 3 — Easypanel configurado pela IA (via API)

**Pré-requisito:** Estágios 1 e 2 completos + Bloco B entregue (panel URL + API token + nome do projeto + repo git + domínio).

### Passos da IA

1. **Descobrir o formato da API** do Easypanel desse cliente:
   ```bash
   curl -s -H "Authorization: Bearer <TOKEN>" <PANEL_URL>/api/trpc/projects.listProjects
   ```
   - **200 OK** com JSON → API tRPC moderna (padrão em versões recentes do Easypanel). Seguir os passos 2-5 abaixo.
   - **404 / 401** → tentar `<PANEL_URL>/api/v1/projects`. Se também falhar, ver "Fallback de emergência" no rodapé desta seção.

2. **Criar projeto** (se ainda não existe no painel):
   ```bash
   curl -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"json":{"name":"<NOME_PROJETO>"}}' \
     <PANEL_URL>/api/trpc/projects.createProject
   ```

3. **Criar service "app"** com source git + build via Dockerfile:
   ```bash
   curl -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{
       "json": {
         "projectName": "<NOME_PROJETO>",
         "serviceName": "app",
         "source": {
           "type": "github",
           "owner": "<owner>",
           "repo": "<repo>",
           "branch": "main",
           "buildPath": "/"
         },
         "build": {
           "type": "dockerfile",
           "file": "docker/Dockerfile"
         }
       }
     }' \
     <PANEL_URL>/api/trpc/services.app.createService
   ```
   > Endpoints exatos (`projects.createProject`, `services.app.createService`, etc.) podem variar entre versões. Use o resultado do passo 1 pra inferir o namespace correto, ou consulte a doc do Easypanel do cliente.

4. **Definir Build Args + Env vars + porta + domínio:**
   - **Build args** (necessários porque `NEXT_PUBLIC_*` são inlineados no bundle no build time):
     - `NEXT_PUBLIC_SUPABASE_URL=<URL do Estágio 1>`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key do Estágio 1>`
   - **Env vars (runtime):** as mesmas duas, mais opcionalmente `SUPABASE_SERVICE_ROLE_KEY=<sb_secret_...>` se forem usar jobs admin server-side.
   - **Porta exposta:** `3000`.
   - **Domínio:** `<dominio do cliente>` com HTTPS ativo (Easypanel emite certificado automático).

   Cada um desses ajustes é um endpoint próprio (tipicamente `services.app.updateEnv`, `services.app.updateDomains`, etc.). Encadear as chamadas em sequência e validar 200 em cada uma.

5. **Validar configuração final** — `GET` no service e conferir que build args, env vars e domínio estão como esperado antes de partir pro Estágio 4.

### Fallback de emergência (UI manual)

Se a API estiver indisponível ou o token sem permissão, pedir pro cliente fazer o setup manual:
1. Easypanel → **Create project** → nome combinado.
2. **+ Service → App** → Source GitHub/GitLab → repo → branch `main`.
3. **Build** → Dockerfile → path `docker/Dockerfile`.
4. **Build Args** → os dois `NEXT_PUBLIC_*`.
5. **Environment** → mesmas vars (runtime) + opcionalmente a secret.
6. **Domains** → adicionar domínio + HTTPS.
7. **Save**.

### Critério de pronto
- Service criado com source git + Dockerfile via API.
- Build args + env vars setadas com a publishable key.
- Domínio mapeado e HTTPS provisionado.

---

## Estágio 4 — Deploy ativo

**Pré-requisito:** Estágio 3 completo.

1. **Adicionar redirect URL de produção no Supabase.**
   - Com PAT: PATCH no config/auth incluindo `https://<dominio>/api/auth/callback` em `uri_allow_list`.
   - Sem PAT: Dashboard → Authentication → URL Configuration → adicionar.

2. **Disparar deploy** no Easypanel (API ou botão **Deploy**).

3. **Acompanhar logs do build.** Falhas comuns:
   - **`NEXT_PUBLIC_*` undefined no bundle** → conferir que estão em **Build Args**, não só runtime.
   - **Typecheck** → rodar `npx tsc --noEmit` local primeiro.
   - **Migration ainda não aplicada** → voltar ao Estágio 1.

4. **Smoke test em produção.**
   - `https://<dominio>` → cadastro → confirma (se aplicável) → login → dashboard.
   - `https://<dominio>/api/chamadas` autenticado → `{ data: [] }`.

### Critério de pronto
- Build verde.
- HTTPS ativo no domínio.
- Cadastro/login/dashboard funcionam em produção.

---

## Pós-deploy

Em `configuracao-estado.md`:
- Marcar Estágio 4 como `[x]`.
- "Próximo passo" → features de IA (geração de relatório a partir da transcrição).
- Adicionar entrada no Histórico com data e URL de produção.

A partir daqui, o cliente pede ao seu time/IA o desenvolvimento das features de IA listadas na seção "Pós-deploy" de `configuracao-estado.md`.

---

## Hand-off entre sessões de IA

Se a sessão atual termina antes do Estágio 4, garanta que:

1. **`configuracao-estado.md` está commitado** com os `[x]` corretos e o "Próximo passo" descrevendo claramente o estado.
2. **Credenciais sensíveis NÃO foram commitadas** — `.env.local`, secret key, PAT. Conferir com `git status` antes de qualquer push.
3. **Decisões tomadas com o cliente** (ex: Confirm email ligado/desligado, escolha de região, domínio) foram anotadas na seção "Decisões registradas" de `configuracao-estado.md`.

A próxima sessão de IA lê `configuracao-estado.md` → identifica o próximo `[ ]` → vem a esta seção do playbook → retoma.
