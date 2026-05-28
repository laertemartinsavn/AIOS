# Anexar Documentos de Escopo às Chamadas

**Data:** 2026-05-28
**Status:** Aprovado

## Contexto

Usuários precisam enriquecer a análise de calls e a geração de propostas com documentos de contexto (RFPs, contratos, escopos técnicos, planilhas de itens). Hoje a IA recebe apenas a transcrição da call. Com documentos anexados, tanto a extração de KPIs quanto a proposta comercial ficam mais assertivas.

## Escopo do MVP

| Incluído | Excluído |
|---|---|
| Upload de até 3 docs (1 MB cada) na criação da chamada | Upload após a chamada ser criada |
| Formatos: PDF, DOCX/DOC, TXT/MD, XLSX/CSV | OCR de PDFs escaneados (imagens) |
| Extração de texto server-side na hora do upload | Delete de documentos pela UI |
| Injeção do texto extraído em análise + proposta | Download/visualização do arquivo original |
| Listagem dos docs na página da chamada | Versionamento de documentos |

---

## 1. Modelo de Dados

### Tabela `documentos`

```sql
CREATE TABLE documentos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id     UUID        NOT NULL REFERENCES chamadas(id) ON DELETE CASCADE,
  nome_arquivo   TEXT        NOT NULL,
  tipo_mime      TEXT        NOT NULL,
  tamanho_bytes  INTEGER     NOT NULL,
  storage_path   TEXT        NOT NULL,
  conteudo_texto TEXT,                  -- null se extração falhar
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_doc_via_chamada" ON documentos
  USING (
    EXISTS (
      SELECT 1 FROM chamadas c
      WHERE c.id = chamada_id AND c.user_id = auth.uid()
    )
  );
```

**RLS:** acesso transitivo via `chamadas.user_id` — mesma estratégia usada em `relatorios` e `propostas`.

**Cascade:** delete de `chamadas` apaga registros em `documentos`. Arquivos no Storage ficam órfãos no MVP (custo negligenciável para o volume esperado; limpeza via job fica fora do escopo).

### Supabase Storage

- **Bucket:** `documentos` (privado, sem acesso público)
- **Caminho:** `{user_id}/{chamada_id}/{uuid}-{nome_original_sanitizado}`
- **Limite no bucket:** configurar max upload size para 1 MB via políticas do bucket

---

## 2. Camada de Serviço

### `src/lib/services/extracao-texto.service.ts`

Função pura: recebe `Buffer` + `mimeType: string`, retorna `string | null`.

| MIME type | Biblioteca |
|---|---|
| `application/pdf` | `pdf-parse` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` / `application/msword` | `mammoth` (extrai texto puro, ignora formatação) |
| `text/plain`, `text/markdown` | UTF-8 nativo (`buffer.toString('utf-8')`) |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` / `text/csv` | `xlsx` (serializa planilha como TSV) |

Se a extração lançar exceção (arquivo corrompido, protegido por senha, binário inválido), retorna `null` — sem propagar o erro. O registro é salvo com `conteudo_texto = null` e a análise roda sem aquele documento.

### `src/lib/repositories/documentos.repository.ts`

- `inserir(supabase, data)` — cria registro na tabela `documentos`
- `listarPorChamada(supabase, chamadaId)` — retorna todos os docs de uma chamada

---

## 3. Camada de API

### `POST /api/chamadas/com-analise` (modificado)

Muda de `application/json` para `multipart/form-data`.

**Campos do formulário:**
- `titulo` (string)
- `transcricao` (string)
- `documentos[]` (File, opcional, 0–3 arquivos)

**Fluxo no route handler:**

1. `requireUser()` — extrai usuário e cliente Supabase
2. Valida campos (Zod): `titulo`, `transcricao`
3. Valida arquivos: máx 3, ≤ 1 MB cada, MIME type permitido
4. Cria `chamada` + `transcricao` (comportamento atual)
5. Para cada arquivo:
   a. Upload para Supabase Storage
   b. Extrai texto via `extracaoTextoService`
   c. Insere registro em `documentos`
6. Chama `analisarCall(transcricao, documentos)` com textos extraídos
7. Retorna resposta atual

Se o upload de Storage falhar para um arquivo, registra o erro em log e continua sem aquele documento (não aborta a criação da chamada).

---

## 4. Integração com a IA

### Formato de injeção (comum a análise e proposta)

Os textos extraídos são inseridos na mensagem do usuário antes da transcrição:

```
[DOCUMENTOS DE CONTEXTO]
--- documento 1: Escopo Projeto.pdf ---
<conteúdo extraído, truncado em 32 KB se necessário>

--- documento 2: Contrato.docx ---
<conteúdo extraído>

[TRANSCRIÇÃO DA CALL]
<transcrição>
```

Se `conteudo_texto` for `null` para um documento, ele é omitido silenciosamente.

**Truncagem:** cada documento é truncado em 32.768 caracteres (~8K tokens) com nota `[... conteúdo truncado]` ao final. Protege contra custo excessivo sem sacrificar documentos típicos de escopo.

### `src/lib/ia/analisar-call.ts` (modificado)

Assinatura adicional: `documentos?: { nome: string; conteudo: string }[]`

### `src/lib/ia/gerar-proposta.ts` (modificado)

Mesma assinatura adicional. O route handler `POST /api/chamadas/[id]/gerar-proposta` busca os documentos via `documentosRepository.listarPorChamada()` antes de chamar o serviço.

---

## 5. Frontend

### `FormNovaChamada` (modificado)

- Zona de upload abaixo do campo de transcrição
- `<input type="file" multiple accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.csv">` oculto, ativado por botão "Anexar documentos"
- Lista os arquivos selecionados: nome, tamanho formatado, botão ✕
- Validação client-side antes do submit: máx 3 arquivos, ≤ 1 MB cada, extensão permitida — mensagem de erro inline
- `fetch` muda para `FormData` (sem `Content-Type` explícito, deixa o browser setar o boundary)

### Página da chamada `/dashboard/chamadas/[id]` (modificado)

Nova seção no aside, entre "Detalhes" e "Histórico":

```
┌─────────────────────────────────┐
│ Documentos                      │
│ • Escopo Projeto.pdf   (842 KB) │
│ • Contrato.docx        (210 KB) │
└─────────────────────────────────┘
```

Sem upload adicional pós-criação. Sem botão de delete no MVP.

---

## 6. Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Arquivo > 1 MB | Erro client-side, sem submit |
| > 3 arquivos | Erro client-side, sem submit |
| MIME não suportado | Erro client-side, sem submit |
| Extração falha (PDF corrompido) | `conteudo_texto = null`, análise roda sem o doc, sem erro para o usuário |
| Upload Storage falha | Log server-side, análise continua sem aquele doc |
| Todos os docs falham na extração | Análise roda só com a transcrição (comportamento atual) |

---

## 7. Dependências a Instalar

```bash
npm install pdf-parse mammoth xlsx
npm install -D @types/pdf-parse
```

`mammoth` e `xlsx` têm tipos próprios. `pdf-parse` precisa do `@types/pdf-parse`.

---

## Fora do Escopo (decisões explícitas)

- **Upload após criação da chamada:** requer UI de edição e novo endpoint; adicionável em iteração futura
- **OCR de PDFs escaneados:** exigiria serviço externo (Google Vision, Textract); custo e complexidade fora do MVP
- **Delete de documentos:** baixa prioridade inicial; Storage tem custo baixo
- **Download do arquivo original:** requer URLs assinadas do Supabase Storage; adicionável facilmente depois
