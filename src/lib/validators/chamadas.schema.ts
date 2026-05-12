import { z } from "zod";

export const criarChamadaSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório").max(200),
  status: z.string().max(50).optional(),
});

export const atualizarChamadaSchema = criarChamadaSchema.partial();

export type CriarChamadaInput = z.infer<typeof criarChamadaSchema>;
export type AtualizarChamadaInput = z.infer<typeof atualizarChamadaSchema>;
