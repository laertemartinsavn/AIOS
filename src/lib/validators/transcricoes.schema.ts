import { z } from "zod";

export const criarTranscricaoSchema = z.object({
  chamada_id: z.string().uuid("chamada_id inválido"),
  conteudo: z.string().min(1, "Conteúdo obrigatório"),
});

export const atualizarTranscricaoSchema = z.object({
  conteudo: z.string().min(1).optional(),
});

export type CriarTranscricaoInput = z.infer<typeof criarTranscricaoSchema>;
export type AtualizarTranscricaoInput = z.infer<typeof atualizarTranscricaoSchema>;
