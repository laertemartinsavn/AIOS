import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  Proposta,
  NovaProposta,
  AtualizaProposta,
} from "@/lib/types/entities";

type Client = SupabaseClient<Database>;

export const propostasRepo = {
  async listar(supabase: Client, chamadaId?: string): Promise<Proposta[]> {
    let query = supabase.from("propostas").select("*").order("created_at", {
      ascending: false,
    });
    if (chamadaId) query = query.eq("chamada_id", chamadaId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async obter(supabase: Client, id: string): Promise<Proposta | null> {
    const { data, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async criar(supabase: Client, input: NovaProposta): Promise<Proposta> {
    const { data, error } = await supabase
      .from("propostas")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizaProposta,
  ): Promise<Proposta | null> {
    const { data, error } = await supabase
      .from("propostas")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remover(supabase: Client, id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("propostas")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
