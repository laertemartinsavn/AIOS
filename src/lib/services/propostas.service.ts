import type { SupabaseClient } from "@supabase/supabase-js";
import { propostasRepo } from "@/lib/repositories/propostas.repo";
import { chamadasRepo } from "@/lib/repositories/chamadas.repo";
import { AppError } from "@/lib/errors/app-error";
import type { Database } from "@/lib/types/database.types";
import type {
  CriarPropostaInput,
  AtualizarPropostaInput,
} from "@/lib/validators/propostas.schema";

type Client = SupabaseClient<Database>;

export const propostasService = {
  async listar(supabase: Client, chamadaId?: string) {
    return propostasRepo.listar(supabase, chamadaId);
  },

  async obter(supabase: Client, id: string) {
    const p = await propostasRepo.obter(supabase, id);
    if (!p) throw new AppError("NOT_FOUND", "Proposta não encontrada");
    return p;
  },

  // TODO(integração): gerar link_externo a partir do relatório (template comercial).
  async criar(supabase: Client, input: CriarPropostaInput) {
    const chamada = await chamadasRepo.obter(supabase, input.chamada_id);
    if (!chamada) throw new AppError("NOT_FOUND", "Chamada não encontrada");

    return propostasRepo.criar(supabase, {
      chamada_id: input.chamada_id,
      link_externo: input.link_externo,
      status: input.status,
    });
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizarPropostaInput,
  ) {
    const atualizada = await propostasRepo.atualizar(supabase, id, input);
    if (!atualizada) throw new AppError("NOT_FOUND", "Proposta não encontrada");
    return atualizada;
  },

  async remover(supabase: Client, id: string) {
    await propostasRepo.remover(supabase, id);
  },
};
