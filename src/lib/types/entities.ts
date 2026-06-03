import type { Database } from "./database.types";

type T = Database["public"]["Tables"];

export type Chamada = T["chamadas"]["Row"];
export type NovaChamada = T["chamadas"]["Insert"];
export type AtualizaChamada = T["chamadas"]["Update"];

export type Transcricao = T["transcricoes"]["Row"];
export type NovaTranscricao = T["transcricoes"]["Insert"];
export type AtualizaTranscricao = T["transcricoes"]["Update"];

export type Relatorio = T["relatorios"]["Row"];
export type NovoRelatorio = T["relatorios"]["Insert"];
export type AtualizaRelatorio = T["relatorios"]["Update"];

export type Proposta = T["propostas"]["Row"];
export type NovaProposta = T["propostas"]["Insert"];
export type AtualizaProposta = T["propostas"]["Update"];

export type Documento = T["documentos"]["Row"];
export type NovoDocumento = T["documentos"]["Insert"];
