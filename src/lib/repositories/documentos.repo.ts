import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { NovoDocumento } from "@/lib/types/entities";

type Supabase = SupabaseClient<Database>;

export const documentosRepo = {
  async inserir(supabase: Supabase, data: NovoDocumento) {
    const { data: doc, error } = await supabase
      .from("documentos")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return doc;
  },

  async listarPorChamada(supabase: Supabase, chamadaId: string) {
    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .eq("chamada_id", chamadaId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
