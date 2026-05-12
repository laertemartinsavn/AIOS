import { z } from "zod";

export const criarPropostaSchema = z.object({
  chamada_id: z.string().uuid("chamada_id inválido"),
  link_externo: z.string().url("link_externo deve ser uma URL válida"),
  status: z.string().max(50).optional(),
});

export const atualizarPropostaSchema = z.object({
  link_externo: z.string().url().optional(),
  status: z.string().max(50).optional(),
});

export type CriarPropostaInput = z.infer<typeof criarPropostaSchema>;
export type AtualizarPropostaInput = z.infer<typeof atualizarPropostaSchema>;
