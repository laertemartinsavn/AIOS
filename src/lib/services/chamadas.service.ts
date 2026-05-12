import type { SupabaseClient } from "@supabase/supabase-js";
import { chamadasRepo } from "@/lib/repositories/chamadas.repo";
import { AppError } from "@/lib/errors/app-error";
import type { Database } from "@/lib/types/database.types";
import type {
  CriarChamadaInput,
  AtualizarChamadaInput,
} from "@/lib/validators/chamadas.schema";

type Client = SupabaseClient<Database>;

export const chamadasService = {
  async listar(supabase: Client) {
    return chamadasRepo.listar(supabase);
  },

  async obter(supabase: Client, id: string) {
    const chamada = await chamadasRepo.obter(supabase, id);
    if (!chamada) throw new AppError("NOT_FOUND", "Chamada não encontrada");
    return chamada;
  },

  async criar(supabase: Client, userId: string, input: CriarChamadaInput) {
    return chamadasRepo.criar(supabase, {
      user_id: userId,
      titulo: input.titulo,
      status: input.status,
    });
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizarChamadaInput,
  ) {
    const atualizada = await chamadasRepo.atualizar(supabase, id, input);
    if (!atualizada) throw new AppError("NOT_FOUND", "Chamada não encontrada");
    return atualizada;
  },

  async remover(supabase: Client, id: string) {
    await chamadasRepo.remover(supabase, id);
  },
};
