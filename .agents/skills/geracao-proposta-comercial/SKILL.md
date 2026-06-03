---
name: geracao-proposta-comercial
description: Use when developing, editing, or improving the proposal generator motor (analisar-call.ts, gerar-proposta.ts, prompts); or when extracting KPIs and generating B2B proposals from client transcripts or meeting notes. This skill is the authoritative business rules repository for the AIOS proposal engine — consult it before any change to the motor.
---

# Geração de Proposta Comercial

## Overview

Esta skill tem dois usos complementares:

1. **Repositório de regras de negócio** — toda vez que você for editar o motor de geração de proposta (`analisar-call.ts`, `gerar-proposta.ts`, ou os prompts que os alimentam), comece por aqui. As regras desta skill são as que o motor deve implementar.

2. **Guia de execução** — quando extrair KPIs de uma transcrição ou gerar uma proposta manualmente, siga as fases abaixo.

**Princípio central:** o escopo da proposta é derivado das dores identificadas — nunca transcrito dos bullets que o cliente fornece. Bullets do cliente são genéricos por natureza; requisitos específicos vêm das dores.

**Dados inventados são piores que campos em branco.** Quando um dado não estiver na fonte, marque como `[não informado]`.

---

## Fase 1 — Mapeamento de Sinais

Antes de extrair KPIs, classifique os sinais da fonte.

### Sinais de Budget

| Sinal na fonte | Tipo | Como usar |
|---|---|---|
| Valor explícito: "nosso budget é R$ X" | Hard | Use diretamente |
| Faixa: "entre R$ X e R$ Y" | Hard | Ancora no meio da faixa |
| "verba aprovada de transformação digital / capex" | Hard | Budget existe; confirme se é dedicado |
| "não pode pesar no caixa" / "precisa ser leve" | Soft ceiling | Teto psicológico ≈ 1–1,5% do faturamento estimado |
| "precisa de aprovação do board / CFO" | Soft | Budget provável, não confirmado |
| ROI declarado pelo cliente (perda evitada, ganho esperado) | Âncora indireta | Use regra do payback (Fase 3) |
| Nenhuma menção de budget | Ausente | Não proponha `valor_total` |

### Sinais de Authority

| Sinal | Classificação |
|---|---|
| "Eu decido", CEO/CFO/CTO ativo na reunião | Decisor confirmado |
| "Vou apresentar para…", "precisa de aprovação de…" | Influenciador — decisor externo |
| Cargo gerencial respondendo sozinho | Provável influenciador |
| "A gente já aprovou a verba" (falado por gerente) | Budget confirmado, authority parcial |

### Sinais de Urgência

| Sinal | Urgência |
|---|---|
| Prazo fixo externo: temporada, regulatório, deadline de board | Alta — evento real, use como âncora de prazo |
| Perda ativa de clientes ou receita confirmada | Alta — dor já está custando |
| "Queremos resolver logo" sem contexto concreto | Baixa — intenção, não pressão |
| "Pode ser no próximo trimestre" | Média |
| "Quando vocês conseguem começar?" | Alta — comprador iniciou o fechamento |

---

## Fase 2 — Extração de KPIs (Artefato 1)

Produza exatamente este bloco:

```
## Artefato 1: KPIs Estruturados

**Empresa:** [nome | setor]
**Contato principal:** [nome | cargo]
**Decisor:** [nome | cargo | relação com o contato | processo de aprovação]

### BANT
- **Budget:** [valor ou faixa | fonte da verba | status de aprovação | tipo: hard/soft/âncora/ausente]
- **Authority:** [quem decide | quem influencia]
- **Need:** [dor principal em 1–2 frases | impacto quantificado se disponível]
- **Timeline:** [prazo declarado | evento gatilho | urgência: alta/média/baixa]

### Análise Qualitativa
- **Sentimento:** [positivo / neutro / resistente] — evidência literal da fonte
- **Urgência:** [alta / média / baixa] — justificativa
- **Tentativas anteriores:** [o que tentaram + por que falhou]

### Dores Identificadas
1. [dor com impacto quantificado se disponível — transcreva como declarada]
2. ...

### Objeções a Endereçar
1. [objeção explícita ou implícita + contexto]
2. ...

### Completude da Análise (preencha sempre)
- Budget: [confirmado / parcial / ausente]
- Authority: [confirmado / parcial / ausente]
- Need: [confirmado / parcial / ausente]
- Timeline: [confirmado / parcial / ausente]
```

**Dores:** transcreva como declaradas — não sintetize nem reinterprete. O impacto quantificado vem da fonte ou fica em branco.

**Objeções implícitas:** tentativa anterior que falhou = objeção implícita. Extraia sempre.

---

## Fase 3 — Calibração de valor_total

### Regra do Payback (quando há ROI declarado)

```
valor_total_max = ROI_declarado × payback_alvo
```

| Perfil | Payback alvo |
|---|---|
| Startup / early stage | 6–12 meses |
| Mid-market (até ~500 funcionários) | 12–18 meses |
| Enterprise | 18–24 meses |

### Nível de Ousadia

| Condições | Nível | Como aplicar |
|---|---|---|
| Budget hard + decisor confirmado + urgência alta | **Ousado** | 70–80% do budget declarado |
| Budget hard + urgência média | **Moderado** | 50–65% do budget declarado |
| Budget hard com soft ceiling ("não pesar") | **Conservador** | ≤ 50% do budget; payback ≤ 12 meses; prefira modelo SaaS/parcelado |
| Budget ausente + ROI declarado | **Ancorado no ROI** | Aplique regra do payback |
| Budget ausente + sem ROI | **Não proponha** | `[a definir após levantamento técnico]` |

**Nunca:** usar percentual de faturamento como base sem dado explícito do cliente; calcular payback com ROI não declarado pelo cliente.

---

## Ratecard — Precificação

**Tabelas completas:** `.agents/skills/geracao-proposta-comercial/ratecard.md` (leia o arquivo quando for calcular valores)  
**Arquivo fonte:** `C:\Users\Laerte Martins\Desktop\Code\AIOS\Ratecard\Rate Card - PJ e CLT - Oficial.xlsx`  
**Base de cálculo:** 168 horas/mês

### Seleção da tabela

| Modalidade solicitada | Tabela a usar |
|---|---|
| CLT | Rate Formatado CLT |
| PJ | Rate Formatado PJ |
| Não informada | Pergunte ao usuário antes de precificar |

### Regime de trabalho

| Regime | Tarifa |
|---|---|
| Home office (padrão) | Coluna "HO $/h" e "HO $/mês" |
| Híbrido / Presencial | Coluna "Pres $/h" e "Pres $/mês" — 10% acima do HO |

Se o regime não for informado, use home office como padrão e registre a premissa.

### Como usar por modelo

| Modelo | Dado a usar do ratecard |
|---|---|
| Body Shop | Valor mensal ($/mês) do perfil solicitado |
| Squad Gerenciada | Soma dos valores mensais de todos os perfis da squad |
| Projeto Fechado SAP / Não SAP | Estime horas por fase → `horas × $/h` por perfil → some todas as fases |

**Projeto Fechado — cálculo por fase:**
1. Para cada fase do cronograma, estime horas por perfil (ex: Consultor SAP FI/CO Sênior: 120h na fase Realize)
2. Multiplique pelo `$/h` da tabela correta (CLT ou PJ, HO ou pres)
3. Some todas as fases para obter o custo total da equipe
4. Aplique então a regra de ousadia da Fase 3 para chegar ao `valor_total` proposto

### Busca por perfil

1. Localize o perfil pelo nome exato na coluna "Perfil" do ratecard.md
2. Se o nome não bater exatamente, use o nível (Júnior/Pleno/Sênior/Especialista) + área mais próxima
3. Se houver dúvida entre dois perfis, prefira o mais conservador (menor valor) e registre a premissa
4. Se o perfil não existir na tabela: use `[a definir]` e registre qual perfil está faltando

**Nunca invente valores fora da tabela.** CLT e PJ têm valores distintos — nunca troque uma pela outra sem instrução explícita.

---

## Fase 4 — Derivação de Escopo a partir das Dores

**O escopo real vem das dores — nunca dos bullets do cliente.**

Bullets do cliente descrevem soluções que eles imaginam. Dores descrevem o problema real. O escopo deriva das dores.

### Processo de derivação

Para cada dor do Artefato 1:
1. Pergunte: **"O que precisaria ser verdade para essa dor não existir mais?"**
2. A resposta é o **requisito** — verificável, orientado ao resultado, não à tecnologia
3. Requisitos similares agrupam-se em um item de escopo
4. O nome do item pode usar o vocabulário do cliente; o conteúdo vem do requisito

**Exemplo:**

| Dor (Artefato 1) | Requisito Derivado | Item de Escopo |
|---|---|---|
| "Vendedor não sabe quais leads priorizar, vai pelo mais fácil" | Vendedor abre o sistema e vê os leads de maior probabilidade de fechamento sem precisar decidir por conta própria | Scoring automático + fila diária por probabilidade de fechamento |
| "Perdemos negócio toda semana por falta de follow-up" | Toda oportunidade sem contato há X dias gera alerta automático — sem depender de disciplina individual | Automação de follow-up com alertas por inatividade |
| "Montar relatório de pipeline leva 2h no Excel, número chutado" | Relatório de pipeline gerado em < 5 minutos com dados em tempo real, pronto para o board | Dashboard de pipeline + exportação para apresentação |

### Tratamento de bullets genéricos do cliente

| Bullet do cliente | O que fazer |
|---|---|
| Resolve uma dor identificada | Use como rótulo do item de escopo; o conteúdo vem do requisito derivado da dor |
| Não resolve nenhuma dor identificada | Não inclua no escopo. Registre: "mencionado pelo cliente, sem dor associada identificada — validar em reunião de levantamento" |
| Mapeia para uma dor de forma incompleta | Derive o requisito completo da dor; o bullet é apenas o ponto de partida |

### Rastreabilidade obrigatória

Cada item de escopo na proposta declara a dor que resolve:
> **Scoring de oportunidades** — resolve: Dor 1 ("vendedor não sabe quais leads priorizar")

### Critérios de Sucesso

Derivados diretamente das dores — são o inverso da dor com a métrica do cliente como baseline:

| Dor | Critério de Sucesso |
|---|---|
| "Vendedor não sabe priorizar" | Vendedor tem fila de trabalho com critério objetivo — sem decisão ad hoc |
| "Pipeline leva 2h no Excel" | Relatório de pipeline gerado em < 5 minutos (baseline declarado pelo cliente: 2h) |
| "Perdemos negócio por falta de follow-up" | Zero oportunidades ativas sem próximo contato agendado |

**Nunca invente percentuais ou prazos.** Use as métricas declaradas pelo cliente. Se o cliente não declarou métrica, descreva o estado final esperado sem número.

### O que NÃO listar como "fora de escopo"

- Itens que nunca foram discutidos — não liste o que o cliente nunca pediu
- "Fora de escopo" = apenas itens explicitamente discutidos pelo cliente e deferidos

---

## Fase 5 — Seleção do Modelo de Proposta

### Confirmação obrigatória antes de construir o escopo

1. Identifique o modelo mais provável pelos sinais da fonte (tabela abaixo)
2. **Confirme com o usuário qual modelo deve ser usado como base** — apresente a opção identificada e aguarde confirmação explícita
3. Confirme também a **modalidade de contratação: CLT ou PJ** (necessária para precificação via ratecard)
4. Use o PDF do modelo confirmado como referência de estrutura: `C:\Users\Laerte Martins\Desktop\Code\AIOS\Modelos\`

**Nunca avance para a Fase 4 sem confirmar modelo e modalidade com o usuário.**

### Critérios de Seleção

| Sinal na fonte | Modelo indicado |
|---|---|
| "preciso de um [perfil] para ficar no nosso time" | **Body Shop** |
| "reforço de capacidade", "alguém para compor a equipe" | **Body Shop** |
| Escopo SAP + entrega definida com prazo | **Projeto Fechado SAP** |
| Escopo não-SAP + entrega definida com prazo | **Projeto Fechado Não SAP** |
| "quero configurar / implementar X" (SAP: S/4HANA, Cloud ALM, etc.) | **Projeto Fechado SAP** |
| "quero desenvolver / integrar / implantar X" (sem menção a SAP) | **Projeto Fechado Não SAP** |
| "precisamos de um time completo", "vários especialistas" | **Squad Gerenciada** |
| "quero o time mas não quero gerenciar cada pessoa" | **Squad Gerenciada** |

**Como identificar se é SAP:** menção explícita a S/4HANA, SAP Cloud ALM, Solution Manager, ABAP, Basis, módulos SAP (FI, CO, MM, SD, WM, etc.). Sem essas referências → Projeto Fechado Não SAP.

### Diferença crítica: Body Shop vs Squad Gerenciada

| Dimensão | Body Shop | Squad Gerenciada |
|---|---|---|
| Quem gerencia tecnicamente | **Cliente** — define atividades e prioridades | **AVN** — gerencia cronograma, qualidade e entregas |
| Quantidade de profissionais | 1 (tipicamente) | Múltiplos perfis coordenados |
| Responsabilidade pela entrega | Do cliente | Da AVN |
| Participação do profissional | Nas rotinas e cerimônias do cliente | Em governança própria da squad com reporte periódico |
| Precificação | Mensal por profissional | Mensal pela squad completa |

**Quando há dúvida entre os dois:** se o cliente tem estrutura interna para dirigir o trabalho → Body Shop. Se o cliente quer o resultado sem gerenciar quem faz → Squad Gerenciada.

### Seções por Modelo

**Regra absoluta:** a proposta deve conter **exatamente** as seções (fundo azul) listadas abaixo para o modelo escolhido, na mesma ordem. É proibido:
- Criar seções novas que não existam na lista
- Renomear seções existentes
- Reordenar seções
- Criar como seção separada qualquer conteúdo que seja subseção interna de outra seção

Se um conteúdo novo surgir do contexto (transcrição, anexos), **encaixe dentro de uma seção já existente**. Nunca crie uma nova seção.

**Screenshots:** `C:\Users\Laerte Martins\Desktop\Code\AIOS\Modelos\Screen Shots - [Nome do Modelo]\`
Alguns screenshots são divididos em partes (ex: "Planejamento - parte 1", "Planejamento - parte 2") — **leia todas as partes** para construir a seção completa.

---

#### MODELO BODY SHOP — seções na ordem exata

Screenshots: `Screen Shots - Body Shop\`

| # | Seção (fundo azul) | Subseções internas (sem fundo azul) |
|---|---|---|
| 1 | FOLHA DE ROSTO | — |
| 2 | TERMO DE CONFIDENCIALIDADE | — |
| 3 | APRESENTAÇÃO | — |
| 4 | OBJETIVO/ ESCOPO | — |
| 5 | GESTÃO E GOVERNANÇA | RESPONSABILIDADES DA [NOME DO CLIENTE] · RESPONSABILIDADES DA AVN TECNOLOGIA |
| 6 | MODALIDADE DE ATUAÇÃO | REGIME DE TRABALHO · CARGA HORÁRIA · DESPESAS COM ATUAÇÃO PRESENCIAL |
| 7 | INVESTIMENTO | VALOR MENSAL DA ALOCAÇÃO · CONDIÇÕES DE FATURAMENTO · VALIDADE DA PROPOSTA |
| 8 | CONSIDERAÇÕES FINAIS | SUBSTITUIÇÃO DO PROFISSIONAL · TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM |
| 9 | ACEITE | — |

---

#### MODELO SQUAD GERENCIADA — seções na ordem exata

Screenshots: `Screen Shots - Squad Gerenciada\`

| # | Seção (fundo azul) | Subseções internas (sem fundo azul) |
|---|---|---|
| 1 | FOLHA DE ROSTO | — |
| 2 | TERMO DE CONFIDENCIALIDADE | — |
| 3 | APRESENTAÇÃO | — |
| 4 | ESCOPO | Descrição do objetivo/escopo do projeto |
| 5 | DOCUMENTAÇÃO | — |
| 6 | PERFIS | PERFIS ALOCADOS PELA AVN (lista detalhada por perfil com competências) |
| 7 | GESTÃO E GOVERNANÇA | RESPONSABILIDADES DA [NOME DO CLIENTE] · RESPONSABILIDADES DA AVN TECNOLOGIA |
| 8 | MODALIDADE DE ATUAÇÃO | — |
| 9 | INVESTIMENTO | EQUIPE SUGERIDA (tabela) · VALOR MENSAL DA SQUAD · CONDIÇÕES DE FATURAMENTO · VALIDADE DA PROPOSTA |
| 10 | CONSIDERAÇÕES FINAIS | SUBSTITUIÇÃO DOS PROFISSIONAIS · TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM |
| 11 | ACEITE | — |

---

#### MODELO PROJETO FECHADO SAP — seções na ordem exata

Screenshots: `Screen Shots - Projeto Fechado SAP\`

| # | Seção (fundo azul) | Subseções internas (sem fundo azul) |
|---|---|---|
| 1 | FOLHA DE ROSTO | — |
| 2 | TERMO DE CONFIDENCIALIDADE | — |
| 3 | APRESENTAÇÃO | — |
| 4 | ESCOPO | 1. [módulos/áreas com etapas SAP Activate] · 2. Etapas do Projeto |
| 5 | PLANEJAMENTO | 3. Planejamento e Execução (diagrama de fases) · Premissas |
| 6 | EQUIPE DO PROJETO | Perfis, dedicação e responsabilidades técnicas |
| 7 | GOVERNANÇA E COMUNICAÇÃO | 5. Governança e Comunicação · Reuniões Executivas · Reuniões Operacionais |
| 8 | MODELO DE EXECUÇÃO | — |
| 9 | SUPORTE | Suporte pós-Go-Live / Hypercare |
| 10 | DOCUMENTAÇÃO TÉCNICA, FUNCIONAL | — |
| 11 | FORA DO ESCOPO | — |
| 12 | GERAL | 12. Responsabilidades da [Cliente] · 13. Premissas Gerais |
| 13 | CRONOGRAMA | Gantt por fase |
| 14 | INVESTIMENTO | 15. Investimento Previsto, Condições de Faturamento e Validade da Proposta |
| 15 | CONSIDERAÇÕES FINAIS | 16. Confidencialidade · 17. Garantia · 18. Termo de Autorização de Uso de Imagem |
| 16 | ACEITE | — |

**Atenção:** responsabilidades do cliente ficam em **GERAL** (não em seção separada). Condições de Faturamento e Validade da Proposta ficam dentro de **INVESTIMENTO**.

---

#### MODELO PROJETO FECHADO NÃO SAP — seções na ordem exata

Screenshots: `Screen Shots - Projeto Fechado Não SAP\`

| # | Seção (fundo azul) | Subseções internas (sem fundo azul) |
|---|---|---|
| 1 | FOLHA DE ROSTO | — |
| 2 | TERMO DE CONFIDENCIALIDADE | — |
| 3 | APRESENTAÇÃO | — |
| 4 | OBJETIVO/ ESCOPO | 1. Objetivo · 2. Realização dos Serviços (a. Materiais e Infraestrutura; b. Estações de Trabalho; c. Local e Horário; d. Condicionantes Técnicas) |
| 5 | PROPOSTA | 3. Escopo (detalhado: tabelas, lista de itens, fluxos) |
| 6 | PREMISSAS, DEPENDÊNCIAS E CONDIÇÕES DE EXECUÇÃO | 1. Premissas Gerais · 2. Recursos do Cliente · 3. Integrações e Interfaces · 4. Dependências de Terceiros |
| 7 | INVESTIMENTO | Prazo/cronograma (diagrama de sprints) · Valor do investimento · CONDIÇÕES DE FATURAMENTO (parcelas por marco com critérios de aceite) · Aceite tácito · Validade da Proposta |
| 8 | CONSIDERAÇÕES FINAIS | CONFIDENCIALIDADE · 17. GARANTIA · 18. TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM INSTITUCIONAL |
| 9 | ACEITE | — |

---

## Fase 6 — Proposta Comercial (Artefato 2)

**Use apenas dados do Artefato 1, escopo derivado na Fase 4, e estrutura do modelo selecionado na Fase 5.**

### Numeração e Título

**Formato do número de proposta:** `[ANO][2200][SEQ]`
- **ANO:** ano corrente com 4 dígitos (ex: 2026)
- **2200:** código fixo da AVN
- **SEQ:** sequencial de 2 dígitos (01, 02, 03…)
- Exemplo: `2026220001`, `2026220002`

Se o número sequencial não for fornecido pelo usuário, pergunte qual é o próximo antes de gerar o documento. Nunca invente o número.

**Título obrigatório:** deve conter o nome do cliente e o número da proposta.  
Formato sugerido: `Proposta Comercial AVN Tecnologia — [Nome do Cliente] — Nº [NÚMERO]`

### Prazos e Condições de Pagamento

Use as condições do **modelo escolhido na Fase 5** como base. Não substitua por condições diferentes. Adaptações (número de parcelas, percentuais por fase) devem seguir a lógica do modelo.

| Modelo | Condição base |
|---|---|
| Body Shop | Mensal por profissional; NF até dia 10; pagamento em 30 dias; reajuste com 30 dias de antecedência |
| Projeto Fechado SAP | Parcelas mensais alinhadas ao cronograma (ex: 7 × ~14,28%), mediante aprovação de racional de atividades |
| Projeto Fechado Não SAP | Por marcos com critérios de aceite; percentuais variáveis por fase; aceite tácito: 5 dias úteis (parciais) / 15 dias corridos (final) |
| Squad Gerenciada | Mensal pela squad completa; NF até dia 10; pagamento em 30 dias; reajuste com 30 dias de antecedência |

### Regras de Geração

#### 1 — Somente as seções do modelo escolhido

A proposta deve ter **exatamente** as seções (fundo azul) listadas na tabela do modelo selecionado acima, na mesma ordem. É proibido:
- Criar seções novas que não existam no modelo
- Renomear seções existentes
- Reordenar seções

Se um conteúdo novo surgir do contexto (transcrição, anexos), **encaixe dentro de uma seção já existente**. Não crie uma nova seção para ele.

#### 2 — Construir cada seção pelos screenshots

Para cada seção, consulte o screenshot correspondente em `Screen Shots - [Modelo]\` e replique:
- O título exato (fundo azul)
- Os subtítulos internos (sem fundo azul, linha separadora)
- A estrutura de parágrafos, listas e tabelas
- Ajuste o **conteúdo** para o contexto da análise; a **estrutura** permanece igual ao modelo

#### 3 — Subseções que jamais viram seções com fundo azul

Estes itens são **conteúdo interno** de uma seção — nunca aparecem com fundo azul próprio:

| Item | Pertence a |
|---|---|
| Responsabilidades da [Cliente] | GESTÃO E GOVERNANÇA (Body Shop / Squad) · GERAL (Projeto Fechado SAP) |
| Responsabilidades da AVN Tecnologia | Idem |
| Condições de Faturamento | INVESTIMENTO |
| Validade da Proposta | INVESTIMENTO |
| Prazo de Validade | INVESTIMENTO |
| Perfis Alocados pela AVN | PERFIS (Squad) · ESCOPO (Body Shop) · EQUIPE DO PROJETO (Proj. Fechado SAP) |
| Premissas | PLANEJAMENTO (Proj. Fechado SAP) · PREMISSAS, DEPENDÊNCIAS... (Proj. Fechado Não SAP) |

#### 4 — Revisão de duplicidades (obrigatória antes de entregar)

Após terminar todos os tópicos, faça uma varredura completa e corrija antes de mostrar o resultado:

- [ ] Existe alguma seção com fundo azul que **não consta** na lista do modelo selecionado? → Delete a seção; mova o conteúdo para a seção correta existente
- [ ] "Responsabilidades do Cliente" ou "Responsabilidades da AVN" aparecem como seção com fundo azul? → Delete; esse conteúdo pertence a GESTÃO E GOVERNANÇA ou GERAL
- [ ] "Condições de Faturamento", "Validade da Proposta" ou "Prazo de Validade" aparecem como seção com fundo azul? → Delete; esse conteúdo pertence a INVESTIMENTO
- [ ] O mesmo assunto aparece em dois tópicos distintos? → Consolide no tópico correto; remova do outro
- [ ] Um parágrafo repete informação já dita em seção anterior? → Remova o parágrafo redundante

**Só entregue o documento após esta revisão.**

### Regras da Proposta

**Decisor:** se o contato principal não é o decisor, o primeiro próximo passo é sempre envolver o decisor.

**Notas estratégicas para o vendedor:** bloco separado no final, após o Artefato 2 — nunca dentro do corpo do documento.

---

## Motor de IA — Regras de Implementação

Esta seção é o contrato entre a skill (regras de negócio) e o código. Ao editar `analisar-call.ts`, `gerar-proposta.ts` ou os prompts que os alimentam, verifique conformidade com cada regra.

### analisar-call.ts

| O motor deve | Nunca deve |
|---|---|
| Extrair cada componente BANT com campo `tipo_sinal` (hard/soft/âncora/ausente) | Inventar tipo de sinal não evidenciado na fonte |
| Transcrever dores como declaradas — não sintetizar | Reinterpretar ou suavizar a dor do cliente |
| Extrair `impacto_quantificado` separadamente (null se indisponível) | Estimar impacto não declarado pelo cliente |
| Marcar tentativa anterior fracassada como objeção implícita | Ignorar o histórico de tentativas anteriores |
| Classificar `urgencia` (alta/média/baixa) com campo `justificativa` | Atribuir urgência sem evidência na fonte |
| Extrair `sentimento` com trecho literal como evidência | Inferir sentimento sem âncora na fonte |
| Identificar o decisor separado do contato principal | Assumir que o contato é o decisor |
| Calcular `completude_bant` para cada componente | Omitir completude quando os dados parecem completos |

### gerar-proposta.ts

| O motor deve | Nunca deve |
|---|---|
| Derivar escopo das dores do Artefato 1 (Fase 4) | Transcrever bullets genéricos do cliente como escopo |
| Referenciar a dor resolvida em cada item de escopo | Incluir itens de escopo sem rastreabilidade a uma dor |
| Calcular `valor_total` via regra do payback ou tabela de ousadia | Inventar ou estimar `valor_total` sem base em budget ou ROI |
| Gerar critérios de sucesso como inverso das dores | Inventar percentuais ou metas não derivadas da fonte |
| Listar "fora de escopo" apenas itens discutidos e deferidos | Listar "fora de escopo" itens nunca mencionados |
| Produzir notas estratégicas em bloco separado | Misturar notas estratégicas no corpo da proposta |
| Usar `[a definir]` quando `completude_bant.budget = ausente` | Gerar seção de Investimento com budget ausente |
| Incluir número de proposta no formato `[ANO]2200[SEQ]` no título | Gerar proposta sem número ou com número inventado |
| Confirmar modelo e modalidade (CLT/PJ) com usuário antes de gerar | Assumir modelo ou modalidade sem confirmação explícita |
| Usar condições de pagamento do modelo escolhido como base | Inventar condições de pagamento ou prazos não presentes no modelo |
| Calcular preços exclusivamente via ratecard (`ratecard.md`) | Usar valores estimados ou inventados fora da tabela |
| Executar passagem de revisão final antes de entregar (eliminar duplicidades) | Entregar proposta sem revisar sobreposição de conteúdo entre seções |

---

## Dados Incompletos

| Dado ausente | O que fazer |
|---|---|
| Budget | BANT-Budget = `[ausente]`; `valor_total` = `[a definir]` |
| Decisor desconhecido | `[não identificado]`; próximo passo = identificar |
| Prazo não declarado | `[não declarado]`; não force urgência artificial |
| Volume/métricas ausentes | Omita cálculo de ROI; descreva o estado final sem números |
| Dor sem impacto quantificado | Extraia a dor sem o número; não estime |

---

## Erros Comuns

| Erro | Correção |
|---|---|
| Usar bullets do cliente como escopo | Derive escopo das dores via Fase 4 |
| Escopo por feature/tecnologia | Reorganize por requisito derivado da dor |
| Inventar critérios de sucesso com percentuais | Use métricas declaradas pelo cliente; descreva o estado final se não há número |
| Listar "fora de escopo" itens nunca discutidos | Só liste itens explicitamente deferidos pelo cliente |
| Inventar `valor_total` sem base em budget ou ROI | Aplique tabela de calibração; se nada disponível, use `[a definir]` |
| Misturar KPIs e proposta no mesmo bloco | Sempre dois artefatos com cabeçalhos distintos |
| Tentativa anterior fracassada não extraída como objeção | Tentativa fracassada = objeção implícita; extraia sempre |
| Notas estratégicas dentro do corpo da proposta | Separe em bloco próprio após o Artefato 2 |
| Omitir bloco de Completude BANT | Escreva sempre, para todos os campos |
| Assumir que o contato é o decisor | Confirme Authority antes de redigir próximos passos |
