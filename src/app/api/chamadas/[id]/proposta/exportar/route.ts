import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors/app-error";
import { chamadasService } from "@/lib/services/chamadas.service";
import { propostasService } from "@/lib/services/propostas.service";
import { gerarDocx } from "@/lib/exportar/gerar-docx";
import { gerarPdf } from "@/lib/exportar/gerar-pdf";

type Ctx = { params: Promise<{ id: string }> };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { supabase } = await requireUser();

    const url = new URL(request.url);
    const formato = url.searchParams.get("formato");
    if (formato !== "docx" && formato !== "pdf") {
      throw new AppError("VALIDATION_ERROR", 'Parâmetro "formato" deve ser "docx" ou "pdf".');
    }

    const chamada = await chamadasService.obter(supabase, id);
    const propostas = await propostasService.listar(supabase, id);
    if (propostas.length === 0) {
      throw new AppError("NOT_FOUND", "Nenhuma proposta encontrada para esta chamada.");
    }
    const proposta = propostas[0];

    const nomeBase = slugify(proposta.titulo ?? chamada.titulo);

    if (formato === "docx") {
      const buffer = await gerarDocx(proposta, chamada.titulo);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${nomeBase}.docx"`,
        },
      });
    }

    const buffer = await gerarPdf(proposta, chamada.titulo);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeBase}.pdf"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
