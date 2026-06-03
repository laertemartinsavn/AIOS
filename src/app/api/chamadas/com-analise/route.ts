import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { transcricoesService } from "@/lib/services/transcricoes.service";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { analisarCall, type DocContexto } from "@/lib/ia/analisar-call";
import { extrairTexto } from "@/lib/services/extracao-texto.service";
import { documentosRepo } from "@/lib/repositories/documentos.repo";

const MIMES_PERMITIDOS = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.ms-excel",
]);

const MAX_BYTES = 1_048_576; // 1 MB
const MAX_DOCS = 3;

const camposSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório").max(200),
  transcricao: z.string().min(1, "Transcrição obrigatória"),
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    const formData = await request.formData();
    const parsed = camposSchema.safeParse({
      titulo: formData.get("titulo"),
      transcricao: formData.get("transcricao"),
    });
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Payload inválido", parsed.error.flatten());
    }

    const arquivos = formData.getAll("documentos").filter((v): v is File => v instanceof File);
    if (arquivos.length > MAX_DOCS) {
      throw new AppError("VALIDATION_ERROR", `Máximo de ${MAX_DOCS} documentos por chamada.`);
    }
    for (const arquivo of arquivos) {
      if (arquivo.size > MAX_BYTES) {
        throw new AppError("VALIDATION_ERROR", `O arquivo "${arquivo.name}" excede o limite de 1 MB.`);
      }
      if (!MIMES_PERMITIDOS.has(arquivo.type)) {
        throw new AppError("VALIDATION_ERROR", `Formato não suportado: "${arquivo.type}".`);
      }
    }

    const chamada = await chamadasService.criar(supabase, user.id, {
      titulo: parsed.data.titulo,
    });

    await transcricoesService.criar(supabase, {
      chamada_id: chamada.id,
      conteudo: parsed.data.transcricao,
    });

    const docContextos: DocContexto[] = [];

    for (const arquivo of arquivos) {
      try {
        const arrayBuffer = await arquivo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const storagePath = `${user.id}/${chamada.id}/${crypto.randomUUID()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, buffer, { contentType: arquivo.type, upsert: false });

        if (uploadError) {
          console.error("[docs] upload falhou:", uploadError.message);
          continue;
        }

        const conteudoTexto = await extrairTexto(buffer, arquivo.type);

        await documentosRepo.inserir(supabase, {
          chamada_id: chamada.id,
          nome_arquivo: arquivo.name,
          tipo_mime: arquivo.type,
          tamanho_bytes: arquivo.size,
          storage_path: storagePath,
          conteudo_texto: conteudoTexto,
        });

        if (conteudoTexto) {
          docContextos.push({ nome: arquivo.name, conteudo: conteudoTexto });
        }
      } catch (err) {
        console.error("[docs] erro ao processar arquivo:", err);
      }
    }

    const analise = await analisarCall(parsed.data.transcricao, docContextos);

    const relatorio = await relatoriosService.criar(supabase, {
      chamada_id: chamada.id,
      ...analise,
    });

    await chamadasService.atualizar(supabase, chamada.id, {
      status: "analisada",
    });

    return NextResponse.json({ chamada, relatorio }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
