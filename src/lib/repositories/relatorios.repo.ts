import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type {
  Relatorio,
  NovoRelatorio,
  AtualizaRelatorio,
} from "@/lib/types/entities";

type Client = SupabaseClient<Database>;

export const relatoriosRepo = {
  async listar(supabase: Client, chamadaId?: string): Promise<Relatorio[]> {
    let query = supabase.from("relatorios").select("*").order("gerado_em", {
      ascending: false,
    });
    if (chamadaId) query = query.eq("chamada_id", chamadaId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async obter(supabase: Client, id: string): Promise<Relatorio | null> {
    const { data, error } = await supabase
      .from("relatorios")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async criar(supabase: Client, input: NovoRelatorio): Promise<Relatorio> {
    const { data, error } = await supabase
      .from("relatorios")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(
    supabase: Client,
    id: string,
    input: AtualizaRelatorio,
  ): Promise<Relatorio | null> {
    const { data, error } = await supabase
      .from("relatorios")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async remover(supabase: Client, id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("relatorios")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
