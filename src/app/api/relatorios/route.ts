import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { errorResponse, AppError } from "@/lib/errors/app-error";
import { relatoriosService } from "@/lib/services/relatorios.service";
import { criarRelatorioSchema } from "@/lib/validators/relatorios.schema";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireUser();
    const { searchParams } = new URL(request.url);
    const chamadaId = searchParams.get("chamada_id") ?? undefined;
    const data = await relatoriosService.listar(supabase, chamadaId);
    return NextResponse.json({ data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser();
    const json = await request.json();
    const parsed = criarRelatorioSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Payload inválido",
        parsed.error.flatten(),
      );
    }
    const data = await relatoriosService.criar(supabase, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
