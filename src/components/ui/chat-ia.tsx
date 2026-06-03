"use client";

import { useEffect, useRef, useState } from "react";

type Mensagem = { papel: "usuario" | "assistente"; conteudo: string };

export interface ChatIAProps {
  endpoint: string;
  titulo: string;
  descricao: string;
  sugestoes: string[];
  placeholder: string;
}

function BolhaDigitando() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-[#F4F5FB] px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A9ABAE]" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A9ABAE]" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A9ABAE]" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export function ChatIA({ endpoint, titulo, descricao, sugestoes, placeholder }: ChatIAProps) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aberto) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando, aberto]);

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || carregando) return;

    const antesDoEnvio = mensagens;
    const novaLista: Mensagem[] = [...mensagens, { papel: "usuario", conteudo: q }];
    setMensagens(novaLista);
    setTexto("");
    setCarregando(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q, historico: antesDoEnvio }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Falha ao obter resposta.");
      }
      const data = await res.json();
      setMensagens([...novaLista, { papel: "assistente", conteudo: data.resposta }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setMensagens([
        ...novaLista,
        { papel: "assistente", conteudo: `Não consegui processar a pergunta: ${msg}` },
      ]);
    } finally {
      setCarregando(false);
      textareaRef.current?.focus();
    }
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(texto);
    }
  }

  const nTrocas = Math.ceil(mensagens.length / 2);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D8DAF0] bg-white shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      {/* Cabeçalho colapsável */}
      <button
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[#3D4392]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="font-brand text-[13px] font-semibold text-[#1F2255]">{titulo}</span>
          {nTrocas > 0 && (
            <span className="rounded-full bg-[#EBECF7] px-2 py-0.5 text-[10px] font-medium text-[#3D4392]">
              {nTrocas}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-[#A9ABAE] transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <>
          {/* Lista de mensagens */}
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto border-t border-[#EBECF7] px-5 py-4">
            {mensagens.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <svg className="h-8 w-8 text-[#C5C8E8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-[12.5px] font-medium text-[#1F2255]">{titulo}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#797C7F]">{descricao}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="rounded-full border border-[#D8DAF0] bg-[#F4F5FB] px-3 py-1 text-[11px] text-[#3D4392] transition-colors hover:bg-[#EBECF7]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((m, i) => (
                <div key={i} className={`flex ${m.papel === "usuario" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                      m.papel === "usuario"
                        ? "rounded-br-sm bg-[#3D4392] text-white"
                        : "rounded-bl-sm bg-[#F4F5FB] text-[#1F2255]"
                    }`}
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {m.conteudo}
                  </div>
                </div>
              ))
            )}
            {carregando && <BolhaDigitando />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-[#EBECF7] px-4 py-3">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              placeholder={placeholder}
              rows={2}
              disabled={carregando}
              className="flex-1 resize-none rounded-xl border border-[#D8DAF0] bg-[#F8F9FE] px-3 py-2 text-[12.5px] leading-relaxed text-[#1F2255] placeholder:text-[#B0B3C6] outline-none focus:border-[#3D4392] focus:ring-2 focus:ring-[#3D4392]/20 disabled:opacity-60"
            />
            <button
              onClick={() => enviar(texto)}
              disabled={!texto.trim() || carregando}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3D4392] text-white transition-colors hover:bg-[#5258AB] disabled:opacity-40"
              aria-label="Enviar pergunta"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
