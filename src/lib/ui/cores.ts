export function corStatusChamada(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "analisada") return "default";
  if (status === "erro") return "destructive";
  return "outline";
}

export function corSentimento(
  sentimento: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  if (sentimento === "positivo") return "default";
  if (sentimento === "negativo") return "destructive";
  return "secondary";
}

export function corProbabilidade(prob: number | null | undefined) {
  if (prob == null) return "text-muted-foreground";
  if (prob >= 71) return "text-emerald-600";
  if (prob >= 41) return "text-amber-600";
  return "text-red-600";
}

export function corStatusProposta(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "aceita":
      return "default";
    case "enviada":
    case "em_negociacao":
      return "secondary";
    case "rejeitada":
    case "expirada":
      return "destructive";
    case "rascunho":
    default:
      return "outline";
  }
}

export function formatarBRL(valor: number | null | undefined) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
