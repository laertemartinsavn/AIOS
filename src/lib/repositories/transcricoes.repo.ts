import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  Transcricao,
  NovaTranscricao,
  AtualizaTranscricao,
} from "@/lib/types/entities";

type Client = SupabaseClient<Database>;

export const transcricoesRepo = {
  async listar(supabase: Client, chamadaId?: string): Promise<Transcricao[]> {
    let query = supabase.from("transcricoes").select("*").order("created_at", {
      ascending: false,
    });
    if (chamadaId) query = query.eq("chamada_id", chamadaId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async obter(supabase: Client, id: string): Promise<Transcricao | null> {
    const { data, error } = await supabase
      .from("transcricoes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async criar(supabase: Client, input: NovaTranscricao): Promise<Transcricao> {
    const { data, error } = await supabase
      .from("transcricoes")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizaTranscricao,
  ): Promise<Transcricao | null> {
    const { data, error } = await supabase
      .from("transcricoes")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remover(supabase: Client, id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("transcricoes")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
