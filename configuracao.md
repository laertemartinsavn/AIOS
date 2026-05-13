# Configuração do AIOS — Playbook

> **Este é um projeto base / template.** Cada cliente que quer rodar o AIOS clona este repositório e executa este playbook com uma sessão de IA (Claude) assistindo. A IA opera duas plataformas em nome do cliente:
>
> - **Supabase** — via **MCP** instalado pelo cliente na sua sessão Claude (`claude_ai_Supabase`). A IA aplica migration, configura auth, regera tipos. O cliente não toca em SQL Editor nem copia chaves.
> - **Vercel** — deploy contínuo a partir de um **fork do repo no GitHub do cliente**. Setup inicial é manual via UI da Vercel (~3 min); a partir daí, cada push gera deploy automático. Dockerfile permanece no repo só como opção de self-host (Vercel ignora).

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

A IA pede apenas o necessário pra cada estágio. Não pedir tudo no início — o cliente pode ainda não ter o fork ou a conta Vercel quando começar.

### Bloco A — Supabase (necessário a partir do Estágio 1)

**Pré-requisito do cliente:** instalar o **MCP do Supabase no Claude** (uma vez, antes da primeira sessão de configuração). Existem dois caminhos — usar o que combina com a interface que o cliente vai usar pra conversar com a IA:

**Opção A — claude.ai (web/desktop):**
1. Cliente vai a https://claude.ai → **Settings → Connectors**.
2. **Add custom connector** → escolher Supabase (ou instalar via marketplace de MCPs).
3. Fazer login na conta Supabase quando solicitado.
4. Confirmar que o MCP aparece como ativo (`claude_ai_Supabase`).

**Opção B — Claude Code (CLI/IDE) usando `.mcp.json` do projeto:**
1. Cliente copia o exemplo do projeto:
   ```bash
   cp .mcp.example.json .mcp.json
   ```
2. Abre `.mcp.json` e substitui `<SEU_PROJECT_REF>` pelo **Reference ID** do projeto Supabase do cliente (Dashboard → **Project Settings → General → Reference ID**).
3. Reabre o Claude Code no diretório do projeto. Quando perguntar se confia no MCP server, aprovar.

> O `.mcp.json` está no `.gitignore` — cada cliente mantém o seu, apontando pro próprio projeto Supabase.

> **Verificação:** na próxima conversa com a IA, ela deve conseguir rodar `list_organizations` e ver as orgs do cliente. Se não conseguir, o MCP não está conectado nessa sessão — pedir pro cliente conferir Settings (Opção A) ou reabrir o Claude Code (Opção B).

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

### Bloco B — Vercel + GitHub (necessário a partir do Estágio 3)

A Vercel se conecta ao **fork do repositório** do cliente no GitHub e faz deploy automático em cada push. A IA **não precisa de token da Vercel** — o setup inicial é manual pela UI da Vercel (~3 min), guiado pela IA.

Pré-requisitos do cliente:

1. **Conta GitHub** com permissão pra criar repositórios privados/públicos.
2. **Fork deste repositório** na conta GitHub do cliente (botão **Fork** na UI do GitHub).
3. **Conta Vercel** — gratuita em https://vercel.com. Recomendado logar via GitHub pra autorização automática dos repos.

Decisões a confirmar com o cliente:

- **Nome do projeto na Vercel** — vira parte da URL `https://<nome>.vercel.app` (ex: `aios-acme`).
- **Domínio customizado?** Opcional. Se sim, o cliente precisa ter o domínio registrado e seguir as instruções DNS da Vercel.

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

## Estágio 3 — Vercel configurada (deploy contínuo)

**Pré-requisito:** Estágios 1 e 2 completos + Bloco B preparado (fork no GitHub do cliente + conta Vercel).

### Passos do cliente (guiados pela IA)

A IA não tem token da Vercel — orienta o cliente e valida o resultado.

1. **Acessar https://vercel.com** e logar (idealmente com a conta GitHub que tem o fork).

2. **Importar projeto:** dashboard Vercel → **Add New… → Project**.

3. **Selecionar repositório:** escolher o fork do AIOS na lista. Se não aparece, clicar **Adjust GitHub App Permissions** e autorizar a Vercel a ver o repo.

4. **Configure Project:**
   - **Project Name:** o combinado no Bloco B.
   - **Framework Preset:** Next.js (Vercel detecta automaticamente — não mexer).
   - **Root Directory:** `./` (padrão).
   - **Build / Output Settings:** padrão.

5. **Environment Variables** — adicionar (a IA entrega os valores prontos do Estágio 1):

   | Nome | Valor | Sensitive? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Não |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) | Não |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) — **opcional**, só se for usar jobs admin server-side | **Sim** |

   Aplicar em todos os 3 ambientes da Vercel: **Production, Preview, Development**.

6. **Deploy.** Clicar **Deploy**. Primeiro build leva ~2 min. Vercel mostra logs em tempo real.

7. **Compartilhar com a IA** a URL de produção (formato `https://<projeto>.vercel.app`). A IA anota em `configuracao-estado.md` → "Decisões registradas".

> **Dockerfile incluso no repo:** existe em `docker/Dockerfile` como opção pra self-host. A Vercel ignora — usa o runtime nativo do Next.js. Não precisa apagar nem configurar.

### O que a IA verifica

- Os 3 (ou 2) env vars foram colados corretos (cliente pode mandar screenshot).
- O primeiro build foi verde (cliente pode mandar print dos logs ou compartilhar o link da deploy).
- A URL pública responde 200 na home `/`.

### Critério de pronto
- Projeto Vercel criado e linkado ao fork do cliente.
- Env vars `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` setadas em Production+Preview+Development.
- Primeiro deploy verde.
- URL `<projeto>.vercel.app` responde 200 e renderiza a home.

---

## Estágio 4 — Produção validada

**Pré-requisito:** Estágio 3 completo + URL pública da Vercel em mãos.

> **Sobre deploys subsequentes:** a Vercel deploya automaticamente a cada push pra branch principal do fork. Não há mais "disparar deploy" manualmente. Os 2 passos abaixo são só pra completar a configuração do Supabase e validar o primeiro deploy.

### Passos

1. **Adicionar redirect URL de produção no Supabase.** Sem isso, signup pelo cadastro em produção redireciona pra `/login?erro=callback`.
   - **Com PAT:** PATCH em `https://api.supabase.com/v1/projects/<ref>/config/auth` adicionando `https://<projeto>.vercel.app/api/auth/callback` em `uri_allow_list`.
   - **Sem PAT:** instruir cliente em Dashboard Supabase → **Authentication → URL Configuration → Redirect URLs** → adicionar.

2. **Smoke test em produção.**
   - Abrir `https://<projeto>.vercel.app` → cadastrar conta → (confirmar email se aplicável) → login → dashboard mostra email.
   - `GET https://<projeto>.vercel.app/api/chamadas` autenticado (com cookie da sessão do navegador) → `{ data: [] }`.

### Falhas comuns

- **`NEXT_PUBLIC_*` undefined em produção** → cliente esqueceu de marcar Production no env var da Vercel. Voltar ao Estágio 3, conferir os 3 environments.
- **Build verde mas página em branco / erro no console do navegador** → muito provavelmente env var incorreto. Inspecionar Network tab → requests pro Supabase devem retornar 200.
- **Callback de cadastro redireciona pra erro** → faltou o passo 1 acima.

### Critério de pronto
- Redirect URL de produção registrada no Supabase.
- Fluxo end-to-end funciona em `https://<projeto>.vercel.app`.

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
