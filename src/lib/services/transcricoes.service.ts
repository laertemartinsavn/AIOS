import type { SupabaseClient } from "@supabase/supabase-js";
import { transcricoesRepo } from "@/lib/repositories/transcricoes.repo";
import { chamadasRepo } from "@/lib/repositories/chamadas.repo";
import { AppError } from "@/lib/errors/app-error";
import type { Database } from "@/lib/types/database.types";
import type {
  CriarTranscricaoInput,
  AtualizarTranscricaoInput,
} from "@/lib/validators/transcricoes.schema";

type Client = SupabaseClient<Database>;

export const transcricoesService = {
  async listar(supabase: Client, chamadaId?: string) {
    return transcricoesRepo.listar(supabase, chamadaId);
  },

  async obter(supabase: Client, id: string) {
    const t = await transcricoesRepo.obter(supabase, id);
    if (!t) throw new AppError("NOT_FOUND", "Transcrição não encontrada");
    return t;
  },

  async criar(supabase: Client, input: CriarTranscricaoInput) {
    const chamada = await chamadasRepo.obter(supabase, input.chamada_id);
    if (!chamada) throw new AppError("NOT_FOUND", "Chamada não encontrada");

    return transcricoesRepo.criar(supabase, {
      chamada_id: input.chamada_id,
      conteudo: input.conteudo,
    });
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizarTranscricaoInput,
  ) {
    const atualizada = await transcricoesRepo.atualizar(supabase, id, input);
    if (!atualizada) throw new AppError("NOT_FOUND", "Transcrição não encontrada");
    return atualizada;
  },

  async remover(supabase: Client, id: string) {
    const ok = await transcricoesRepo.remover(supabase, id);
    if (!ok) throw new AppError("NOT_FOUND", "Transcrição não encontrada");
  },
};
