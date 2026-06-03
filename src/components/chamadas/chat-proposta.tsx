"use client";

import { ChatIA } from "@/components/ui/chat-ia";

export function ChatProposta({ chamadaId }: { chamadaId: string }) {
  return (
    <ChatIA
      endpoint={`/api/chamadas/${chamadaId}/proposta/chat`}
      titulo="Perguntar sobre a proposta"
      descricao={`Pergunte sobre o valor calculado, racional do escopo,\nperfis escolhidos, prazos estimados e muito mais.`}
      sugestoes={[
        "De onde veio o valor total calculado?",
        "Qual o racional por perfil no investimento?",
        "Por que este prazo de entrega foi estimado?",
        "Quais dores da análise embasaram o escopo?",
      ]}
      placeholder="Pergunte algo sobre a proposta… (Enter envia, Shift+Enter nova linha)"
    />
  );
}
