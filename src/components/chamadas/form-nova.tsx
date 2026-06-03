"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarraProgressoIA } from "@/components/ui/barra-progresso-ia";

const MIMES_ACEITOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.ms-excel",
];
const EXTENSOES = ".pdf,.docx,.doc,.txt,.md,.xlsx,.csv";
const MAX_BYTES = 1_048_576;
const MAX_DOCS = 3;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FormNovaChamada() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erroArquivos, setErroArquivos] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function aoSelecionarArquivos(e: React.ChangeEvent<HTMLInputElement>) {
    const novos = Array.from(e.target.files ?? []);
    const combinados = [...arquivos, ...novos];

    if (combinados.length > MAX_DOCS) {
      setErroArquivos(`Máximo de ${MAX_DOCS} documentos.`);
      e.target.value = "";
      return;
    }
    for (const f of novos) {
      if (f.size > MAX_BYTES) {
        setErroArquivos(`"${f.name}" excede 1 MB.`);
        e.target.value = "";
        return;
      }
      if (!MIMES_ACEITOS.includes(f.type)) {
        setErroArquivos(`Formato não suportado: "${f.name}".`);
        e.target.value = "";
        return;
      }
    }
    setErroArquivos(null);
    setArquivos(combinados);
    e.target.value = "";
  }

  function removerArquivo(index: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
    setErroArquivos(null);
  }

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const fd = new FormData();
      fd.append("titulo", titulo);
      fd.append("transcricao", transcricao);
      for (const arquivo of arquivos) {
        fd.append("documentos", arquivo);
      }

      const res = await fetch("/api/chamadas/com-analise", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Falha ao analisar a chamada.");
      }
      const { chamada } = await res.json();
      toast.success("Análise gerada com sucesso!");
      router.push(`/dashboard/chamadas/${chamada.id}`);
      router.refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(mensagem);
      setCarregando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#D8DAF0] bg-white p-8 shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      <form onSubmit={aoEnviar} className="flex flex-col gap-5">
        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="titulo" className="font-brand text-[13px] font-semibold text-[#1F2255]">
            Título
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Acme Tech — análise 12/05"
            required
            maxLength={200}
            disabled={carregando}
            className="rounded-lg border border-[#D8DAF0] bg-[#F4F5FB] px-4 py-2.5 text-[13px] text-[#1F2255] placeholder:text-[#A9ABAE] outline-none focus:border-[#3D4392] focus:ring-2 focus:ring-[#3D4392]/20 disabled:opacity-60"
          />
        </div>

        {/* Transcrição */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transcricao" className="font-brand text-[13px] font-semibold text-[#1F2255]">
            Transcrição
          </label>
          <textarea
            id="transcricao"
            value={transcricao}
            onChange={(e) => setTranscricao(e.target.value)}
            placeholder="Cole aqui a transcrição completa da análise..."
            required
            rows={14}
            disabled={carregando}
            className="rounded-lg border border-[#D8DAF0] bg-[#F4F5FB] px-4 py-3 font-mono text-[12px] text-[#1F2255] placeholder:text-[#A9ABAE] outline-none focus:border-[#3D4392] focus:ring-2 focus:ring-[#3D4392]/20 disabled:opacity-60 resize-none"
          />
          <p className="text-[11px] text-[#A9ABAE]">
            {transcricao.length.toLocaleString("pt-BR")} caracteres
          </p>
        </div>

        {/* Documentos */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-brand text-[13px] font-semibold text-[#1F2255]">
              Documentos de contexto
              <span className="ml-1.5 font-normal text-[#797C7F]">(opcional)</span>
            </label>
            <span className="text-[11px] text-[#A9ABAE]">{arquivos.length}/{MAX_DOCS}</span>
          </div>

          {arquivos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {arquivos.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#EBECF7] bg-[#F4F5FB] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon />
                    <span className="truncate text-[12px] text-[#1F2255]">{f.name}</span>
                    <span className="shrink-0 text-[11px] text-[#A9ABAE]">{formatBytes(f.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerArquivo(i)}
                    disabled={carregando}
                    className="ml-2 shrink-0 text-[#A9ABAE] hover:text-[#C8423D] disabled:opacity-40"
                    aria-label="Remover"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {arquivos.length < MAX_DOCS && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={EXTENSOES}
                onChange={aoSelecionarArquivos}
                disabled={carregando}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={carregando}
                className="flex items-center gap-2 rounded-lg border border-dashed border-[#D8DAF0] px-4 py-2.5 text-[13px] text-[#797C7F] transition-colors hover:border-[#3D4392] hover:bg-[#F4F5FB] hover:text-[#3D4392] disabled:opacity-50"
              >
                <PaperclipIcon />
                Anexar documento
              </button>
            </>
          )}

          {erroArquivos && (
            <p className="text-[12px] text-[#C8423D]">{erroArquivos}</p>
          )}
          <p className="text-[11px] text-[#A9ABAE]">
            PDF, DOCX, TXT, XLSX, CSV — máx. 1 MB por arquivo. Os documentos enriquecem a análise e a proposta.
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={carregando}
            className="rounded-lg border border-[#D8DAF0] px-4 py-2.5 text-[13px] text-[#1F2255] transition-colors hover:bg-[#F4F5FB] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-[#3D4392] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_4px_12px_rgba(61,67,146,0.22)] transition-colors hover:bg-[#5258AB] disabled:opacity-60"
          >
            {carregando ? "Analisando com IA…" : "Salvar e analisar"}
          </button>
        </div>

        <BarraProgressoIA
          ativo={carregando}
          estimadoSegundos={30}
          label={`Analisando transcrição${arquivos.length > 0 ? " e documentos" : ""} com IA…`}
        />
      </form>
    </div>
  );
}

const PaperclipIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const FileIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0 text-[#3D4392]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const XIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
