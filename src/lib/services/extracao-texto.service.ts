const MAX_CHARS = 32768;

export async function extrairTexto(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const text = await extrairBruto(buffer, mimeType);
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (trimmed.length <= MAX_CHARS) return trimmed;
    return trimmed.slice(0, MAX_CHARS) + "\n[... conteúdo truncado]";
  } catch {
    return null;
  }
}

async function extrairBruto(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      lines.push(`=== ${sheetName} ===`);
      lines.push(XLSX.utils.sheet_to_csv(sheet));
    }
    return lines.join("\n");
  }

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return buffer.toString("utf-8");
  }

  return null;
}
