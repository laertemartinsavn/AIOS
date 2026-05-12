import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  Chamada,
  NovaChamada,
  AtualizaChamada,
} from "@/lib/types/entities";

type Client = SupabaseClient<Database>;

export const chamadasRepo = {
  async listar(supabase: Client): Promise<Chamada[]> {
    const { data, error } = await supabase
      .from("chamadas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async obter(supabase: Client, id: string): Promise<Chamada | null> {
    const { data, error } = await supabase
      .from("chamadas")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async criar(supabase: Client, input: NovaChamada): Promise<Chamada> {
    const { data, error } = await supabase
      .from("chamadas")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizaChamada,
  ): Promise<Chamada | null> {
    const { data, error } = await supabase
      .from("chamadas")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remover(supabase: Client, id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("chamadas")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
