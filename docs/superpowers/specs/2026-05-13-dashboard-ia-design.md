# Dashboard + Agentes de IA — Design

**Data:** 2026-05-13
**Status:** Aprovado (aguardando review do spec)

## 1. Visão Geral

Adiciona ao AIOS:
- Dashboard moderno (tema light, shadcn/ui) para visualizar chamadas, relatórios e propostas.
- 2 agentes de IA usando Anthropic Sonnet 4.6:
  - **Agente de Análise** — recebe transcrição → preenche todos os KPIs do `relatorios`.
  - **Agente de Proposta** — recebe relatório → preenche todos os KPIs de `propostas`.

Cliente final vê o fluxo: colar transcrição → análise gerada → opção de gerar proposta comercial → ver proposta com link externo.

## 2. Stack adicionada

- **shadcn/ui** com componentes: `card`, `button`, `input`, `textarea`, `label`, `badge`, `table`, `separator`, `skeleton`, `sonner` (toasts).
- **`@anthropic-ai/sdk`** para invocar Sonnet com tool_use estruturado.
- **Env var `ANTHROPIC_API_KEY`** (opcional na config Zod; obrigatória apenas quando o usuário aciona "Analisar"/"Gerar proposta").
- Tema **light fixo** — sem toggle dark.

## 3. Páginas

Todas em `(app)` (protegidas pelo proxy).

### 3.1 `/dashboard` (refeita)
- Top-nav: logo "AIOS" + email do usuário + link Sair.
- 4 stats cards no topo: **Total de chamadas**, **Analisadas** (com relatório), **Propostas geradas**, **Valor estimado total** (soma de `valor_estimado_brl` dos relatórios).
- Tabela "Chamadas recentes" (10 mais novas): título, status, data, badges indicando se já tem análise/proposta. Clique numa linha vai pra `/dashboard/chamadas/[id]`.
- Botão primary "+ Nova chamada" → `/dashboard/chamadas/nova`.

### 3.2 `/dashboard/chamadas/nova`
- Form simples num card:
  - Input **Título** (required, max 200).
  - Textarea **Transcrição** (required, min 1 char, sem max hard — limite real é o do modelo).
  - Botões: **Cancelar** (volta pra /dashboard) e **Salvar e analisar** (primary).
- Ao submeter:
  - Disable todos os controls + texto "Analisando transcrição com IA... (pode levar até 30s)".
  - `POST /api/chamadas/com-analise` com `{ titulo, transcricao }`.
  - Em sucesso: toast verde + redirect `/dashboard/chamadas/<id>`.
  - Em falha: toast vermelho + reabilita o form, preservando o conteúdo.

### 3.3 `/dashboard/chamadas/[id]`
- Header: ← Voltar • título da chamada • badge de status.
- 3 stats cards: **Probabilidade de fechamento** (com cor por faixa), **Valor estimado** (R$), **Sentimento** (badge colorido).
- Seção "Resumo executivo" (card com texto).
- Seção "BANT" (4 mini-cards: budget, autoridade, necessidade, prazo).
- Seção "Insights" (3 colunas: Dores identificadas, Objeções, Próximos passos — cada uma como lista de chips/badges).
- Seção "Análise completa" (card expandível com o `conteudo` markdown).
- Rodapé: se ainda não tem proposta → botão **"Gerar proposta comercial →"**. Se tem → botão **"Ver proposta →"** apontando pra `/dashboard/chamadas/[id]/proposta`.
- Clique em "Gerar proposta": `POST /api/chamadas/[id]/gerar-proposta`. Mesmo padrão de loading/toast/redirect da pagina nova.

### 3.4 `/dashboard/chamadas/[id]/proposta`
- Header: ← Voltar • título da proposta • badges (status, versão `v1`).
- Stats: **Valor total** (R$ + moeda), **Prazo entrega** (dias), **Validade** (dias), **Enviada em** (data ou "—").
- Seção "Resumo da solução".
- Seção "Escopo" (lista numerada dos itens).
- Seção "Condições de pagamento".
- Botão grande: **"↗ Abrir proposta externa"** apontando pra `link_externo` (target=_blank).

## 4. Endpoints novos

### 4.1 `POST /api/chamadas/com-analise`
Atômico: cria chamada + transcrição + dispara agente + salva relatório.

**Body Zod:**
```ts
{ titulo: string min 1 max 200, transcricao: string min 1 }
```

**Fluxo:**
1. `requireUser()`.
2. `chamadasService.criar({ titulo })` — usa `user.id`.
3. `transcricoesService.criar({ chamada_id, conteudo: transcricao })`.
4. `agenteAnalise.analisar(transcricao)` — retorna objeto com KPIs validados pelo tool_schema.
5. `relatoriosService.criar({ chamada_id, ...output })`.
6. Retorna `{ chamada, relatorio }` com status 201.

**Falhas:**
- Anthropic API key ausente → 500 `AppError("INTERNAL_ERROR", "ANTHROPIC_API_KEY não configurada")`.
- Agente falha → ainda persiste chamada+transcrição (não fazer rollback); retorna 502 com mensagem clara pra usuário poder re-tentar a análise depois.
  - *Decisão pragmática*: por enquanto sem retry endpoint dedicado. Se falhar, o usuário pode deletar a chamada e tentar de novo. Endpoint "re-analisar" fica como TODO.

### 4.2 `POST /api/chamadas/[id]/gerar-proposta`
**Sem body** (usa o relatório existente da chamada como input).

**Fluxo:**
1. `requireUser()`.
2. Buscar `chamada` (404 se não existir).
3. Buscar `relatorio` da chamada (422 se ainda não foi analisada).
4. Buscar `transcricao` (necessária pra dar contexto adicional ao agente).
5. `agenteProposta.gerar({ relatorio, transcricao })` — retorna campos da proposta.
6. `propostasService.criar({ chamada_id, ...output })`.
7. Retorna `{ proposta }` com 201.

## 5. Agentes IA

### 5.1 Cliente Anthropic compartilhado — `src/lib/ia/anthropic-client.ts`
- Singleton lazy. Lança `AppError` se `ANTHROPIC_API_KEY` não está set.

### 5.2 Agente de Análise — `src/lib/ia/analisar-call.ts`

**Modelo:** `claude-sonnet-4-6` (ID literal — mais recente Sonnet).

**Tool schema (`registrar_analise`):**
- Espelha as colunas de `relatorios` (sem `id`, `chamada_id`, `gerado_em`).
- Required: `conteudo`, `resumo_executivo`, `sentimento`.
- Outros opcionais — agente preenche só se a transcrição der pistas claras.

**System prompt** (com `cache_control: ephemeral` pra prompt caching):
- "Você é um analista de vendas especializado em discovery calls B2B em português."
- Define cada KPI brevemente.
- Instrui a preencher só o que tem evidência na transcrição (não inventar).
- Tom: factual, objetivo.

**Messages:**
- `user: "Analise a transcrição abaixo:\n\n<TRANSCRICAO>"`.

**Inferência:** `tool_choice: { type: "tool", name: "registrar_analise" }`.

**Output:** retorna o `input` do tool_use diretamente (já validado pelo schema do tool).

### 5.3 Agente de Proposta — `src/lib/ia/gerar-proposta.ts`

**Modelo:** `claude-sonnet-4-6`.

**Tool schema (`registrar_proposta`):**
- Espelha colunas de `propostas` (sem `id`, `chamada_id`, `created_at`).
- Required: `titulo`, `resumo_solucao`, `link_externo`.
- `link_externo` por enquanto: o agente gera um placeholder marcado como `https://propostas.aios.local/<chamada_id>` — não há geração real de PDF/página; tarefa futura. Documentado como TODO no código.

**System prompt** (cacheado):
- "Você é um consultor comercial sênior."
- Tarefa: dado o relatório de análise, redigir título, resumo da solução, escopo (lista de entregáveis), valor (extrair `valor_estimado_brl` do relatório), condições, prazo, validade.
- Tom: profissional, conciso, em português.

**Messages:**
- `user: "Relatório da call:\n<JSON do relatorio>\n\nTranscrição original:\n<TRANSCRICAO>"`.

**Output:** mesmo padrão (input do tool_use).

### 5.4 Prompt caching
- System prompt de cada agente é cached (TTL 5min). Reduz custo nas chamadas seguintes da mesma sessão.

## 6. Env vars

Adicionar em `src/lib/config/env.ts`:
```ts
ANTHROPIC_API_KEY: z.string().min(1).optional()
```

E em `.env.example`:
```
# Anthropic — necessária para os agentes de análise/proposta.
# Obter em https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=
```

## 7. Estrutura de arquivos novos

```
src/
  app/(app)/
    dashboard/page.tsx                              # refeita
    dashboard/chamadas/nova/page.tsx                # novo
    dashboard/chamadas/[id]/page.tsx                # novo
    dashboard/chamadas/[id]/proposta/page.tsx       # novo
  app/api/
    chamadas/com-analise/route.ts                   # novo
    chamadas/[id]/gerar-proposta/route.ts           # novo
  components/
    ui/                                             # shadcn (button, card, input, ...)
    layout/top-nav.tsx                              # nav simples
    chamadas/stats-cards.tsx                        # stats do dashboard
    chamadas/lista-chamadas.tsx                     # tabela do dashboard
    chamadas/form-nova.tsx                          # form de nova chamada (client)
    chamadas/painel-analise.tsx                     # render da análise
    chamadas/painel-proposta.tsx                    # render da proposta
  lib/
    ia/
      anthropic-client.ts
      analisar-call.ts
      gerar-proposta.ts
    utils.ts                                        # shadcn cn() helper (gerado)
```

## 8. UX / micro-interações

- Loading: full overlay no card do form quando processando IA.
- Toast: shadcn `sonner`.
- Acessibilidade: shadcn já inclui (Radix).
- Empty state na lista de chamadas: card centralizado "Nenhuma chamada ainda. Crie a primeira."
- Cores de sentimento: positivo (verde), neutro (slate), negativo (vermelho).
- Cor de probabilidade: 0-40 vermelho, 41-70 amarelo, 71-100 verde.

## 9. Fora de escopo

- Geração real de PDF/página de proposta (`link_externo` real). Por enquanto, placeholder URL.
- Re-análise de chamada existente (endpoint de retry).
- Edição inline dos campos do relatório/proposta (só leitura por enquanto).
- Filtros/busca/paginação na lista de chamadas.
- Mobile responsivo otimizado (TW v4 funciona em mobile, mas layout não foi pensado pra ele).
- Streaming da resposta da IA (UX seria melhor mas adiciona complexidade — versão futura).
- Testes automatizados (consistente com decisão do spec original).
