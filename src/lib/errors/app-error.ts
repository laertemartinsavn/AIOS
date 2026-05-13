import { NextResponse } from "next/server";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: STATUS_BY_CODE[err.code] },
    );
  }

  console.error("Unhandled error:", err);

  const isDev = process.env.NODE_ENV !== "production";
  const message =
    isDev && err instanceof Error ? err.message : "Erro interno";
  const details =
    isDev && err instanceof Error
      ? { name: err.name, stack: err.stack?.split("\n").slice(0, 8) }
      : undefined;

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message, details } },
    { status: 500 },
  );
}
