import { z } from "zod";

const STATUS_PROPOSTA = [
  "rascunho",
  "enviada",
  "em_negociacao",
  "aceita",
  "rejeitada",
  "expirada",
] as const;

const propostaBaseSchema = z.object({
  link_externo: z.string().url("link_externo deve ser uma URL válida"),
  status: z.enum(STATUS_PROPOSTA).optional(),
  titulo: z.string().max(200).optional(),
  resumo_solucao: z.string().optional(),
  escopo: z.array(z.any()).optional(),
  valor_total: z.number().nonnegative().optional(),
  moeda: z.string().min(3).max(3).optional(),
  condicoes_pagamento: z.string().optional(),
  prazo_entrega_dias: z.number().int().nonnegative().optional(),
  validade_dias: z.number().int().nonnegative().optional(),
  enviada_em: z.string().datetime().optional(),
  versao: z.number().int().min(1).optional(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conteudo_secoes: z.any().optional(),
});

export const criarPropostaSchema = propostaBaseSchema.extend({
  chamada_id: z.string().uuid("chamada_id inválido"),
});

export const atualizarPropostaSchema = propostaBaseSchema.partial();

export type CriarPropostaInput = z.infer<typeof criarPropostaSchema>;
export type AtualizarPropostaInput = z.infer<typeof atualizarPropostaSchema>;
