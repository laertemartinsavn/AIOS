import type { SupabaseClient } from "@supabase/supabase-js";
import { relatoriosRepo } from "@/lib/repositories/relatorios.repo";
import { chamadasRepo } from "@/lib/repositories/chamadas.repo";
import { AppError } from "@/lib/errors/app-error";
import type { Database } from "@/lib/types/database.types";
import type {
  CriarRelatorioInput,
  AtualizarRelatorioInput,
} from "@/lib/validators/relatorios.schema";

type Client = SupabaseClient<Database>;

export const relatoriosService = {
  async listar(supabase: Client, chamadaId?: string) {
    return relatoriosRepo.listar(supabase, chamadaId);
  },

  async obter(supabase: Client, id: string) {
    const r = await relatoriosRepo.obter(supabase, id);
    if (!r) throw new AppError("NOT_FOUND", "Relatório não encontrado");
    return r;
  },

  // TODO(integração): gerar `conteudo` a partir da transcrição com IA.
  // Por enquanto recebe o conteúdo pronto pelo body.
  async criar(supabase: Client, input: CriarRelatorioInput) {
    const chamada = await chamadasRepo.obter(supabase, input.chamada_id);
    if (!chamada) throw new AppError("NOT_FOUND", "Chamada não encontrada");

    return relatoriosRepo.criar(supabase, {
      chamada_id: input.chamada_id,
      conteudo: input.conteudo,
    });
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizarRelatorioInput,
  ) {
    const atualizado = await relatoriosRepo.atualizar(supabase, id, input);
    if (!atualizado) throw new AppError("NOT_FOUND", "Relatório não encontrado");
    return atualizado;
  },

  async remover(supabase: Client, id: string) {
    await relatoriosRepo.remover(supabase, id);
  },
};
