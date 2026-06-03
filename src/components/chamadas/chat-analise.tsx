"use client";

import { ChatIA } from "@/components/ui/chat-ia";

export function ChatAnalise({ chamadaId }: { chamadaId: string }) {
  return (
    <ChatIA
      endpoint={`/api/chamadas/${chamadaId}/chat`}
      titulo="Perguntar sobre a análise"
      descricao={`Pergunte sobre valores estimados, racional da IA,\ntrechos da transcrição e muito mais.`}
      sugestoes={[
        "De onde veio o valor estimado?",
        "Qual o racional da probabilidade de fechamento?",
        "Cite o trecho que embasou a dor principal",
        "O decisor foi identificado? O que foi dito?",
      ]}
      placeholder="Pergunte algo sobre a análise… (Enter envia, Shift+Enter nova linha)"
    />
  );
}
