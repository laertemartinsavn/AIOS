export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chamadas: {
        Row: {
          created_at: string
          id: string
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          chamada_id: string
          conteudo_texto: string | null
          created_at: string
          id: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
        }
        Insert: {
          chamada_id: string
          conteudo_texto?: string | null
          created_at?: string
          id?: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
        }
        Update: {
          chamada_id?: string
          conteudo_texto?: string | null
          created_at?: string
          id?: string
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo_mime?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_chamada_id_fkey"
            columns: ["chamada_id"]
            isOneToOne: false
            referencedRelation: "chamadas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          chamada_id: string
          condicoes_pagamento: string | null
          conteudo_secoes: Json | null
          created_at: string
          enviada_em: string | null
          escopo: Json
          id: string
          link_externo: string
          moeda: string
          prazo_entrega_dias: number | null
          resumo_solucao: string | null
          status: string
          titulo: string | null
          validade_dias: number
          valor_total: number | null
          versao: number
        }
        Insert: {
          chamada_id: string
          condicoes_pagamento?: string | null
          conteudo_secoes?: Json | null
          created_at?: string
          enviada_em?: string | null
          escopo?: Json
          id?: string
          link_externo: string
          moeda?: string
          prazo_entrega_dias?: number | null
          resumo_solucao?: string | null
          status?: string
          titulo?: string | null
          validade_dias?: number
          valor_total?: number | null
          versao?: number
        }
        Update: {
          chamada_id?: string
          condicoes_pagamento?: string | null
          conteudo_secoes?: Json | null
          created_at?: string
          enviada_em?: string | null
          escopo?: Json
          id?: string
          link_externo?: string
          moeda?: string
          prazo_entrega_dias?: number | null
          resumo_solucao?: string | null
          status?: string
          titulo?: string | null
          validade_dias?: number
          valor_total?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_chamada_id_fkey"
            columns: ["chamada_id"]
            isOneToOne: false
            referencedRelation: "chamadas"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          bant_autoridade: string | null
          bant_budget: string | null
          bant_necessidade: string | null
          bant_prazo: string | null
          chamada_id: string
          conteudo: string
          dores_identificadas: Json
          gerado_em: string
          id: string
          objecoes: Json
          probabilidade_fechamento: number | null
          proximos_passos: Json
          resumo_executivo: string | null
          sentimento: string | null
          valor_estimado_brl: number | null
        }
        Insert: {
          bant_autoridade?: string | null
          bant_budget?: string | null
          bant_necessidade?: string | null
          bant_prazo?: string | null
          chamada_id: string
          conteudo: string
          dores_identificadas?: Json
          gerado_em?: string
          id?: string
          objecoes?: Json
          probabilidade_fechamento?: number | null
          proximos_passos?: Json
          resumo_executivo?: string | null
          sentimento?: string | null
          valor_estimado_brl?: number | null
        }
        Update: {
          bant_autoridade?: string | null
          bant_budget?: string | null
          bant_necessidade?: string | null
          bant_prazo?: string | null
          chamada_id?: string
          conteudo?: string
          dores_identificadas?: Json
          gerado_em?: string
          id?: string
          objecoes?: Json
          probabilidade_fechamento?: number | null
          proximos_passos?: Json
          resumo_executivo?: string | null
          sentimento?: string | null
          valor_estimado_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_chamada_id_fkey"
            columns: ["chamada_id"]
            isOneToOne: false
            referencedRelation: "chamadas"
            referencedColumns: ["id"]
          },
        ]
      }
      transcricoes: {
        Row: {
          chamada_id: string
          conteudo: string
          created_at: string
          id: string
        }
        Insert: {
          chamada_id: string
          conteudo: string
          created_at?: string
          id?: string
        }
        Update: {
          chamada_id?: string
          conteudo?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcricoes_chamada_id_fkey"
            columns: ["chamada_id"]
            isOneToOne: false
            referencedRelation: "chamadas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
