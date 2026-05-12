import { z } from "zod";

export const criarRelatorioSchema = z.object({
  chamada_id: z.string().uuid("chamada_id inválido"),
  conteudo: z.string().min(1, "Conteúdo obrigatório"),
});

export const atualizarRelatorioSchema = z.object({
  conteudo: z.string().min(1).optional(),
});

export type CriarRelatorioInput = z.infer<typeof criarRelatorioSchema>;
export type AtualizarRelatorioInput = z.infer<typeof atualizarRelatorioSchema>;
