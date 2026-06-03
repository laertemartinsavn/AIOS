import fs from "fs/promises";
import path from "path";

export type Screenshot = {
  nome: string;
  base64: string;
};

const PASTA_SCREENSHOTS: Record<string, string> = {
  "body-shop": "Screen Shots - Body Shop",
  "projeto-fechado-nao-sap": "Screen Shots - Projeto Fechado Não SAP",
  "projeto-fechado-sap": "Screen Shots - Projeto Fechado SAP",
  "squad-gerenciada": "Screen Shots - Squad Gerenciada",
};

// Não são seções de conteúdo — apenas layout
const EXCLUIR = new Set(["Cabeçalho.JPG", "Rodapé.JPG", "Cabeçalho.jpg", "Rodapé.jpg"]);

export async function lerScreenshots(modeloId: string): Promise<Screenshot[]> {
  const pasta = PASTA_SCREENSHOTS[modeloId];
  if (!pasta) return [];

  const dir = path.join(process.cwd(), "Modelos", pasta);

  let arquivos: string[];
  try {
    arquivos = await fs.readdir(dir);
  } catch {
    return [];
  }

  const jpgs = arquivos
    .filter((f) => /\.(jpg|jpeg)$/i.test(f) && !EXCLUIR.has(f))
    .sort();

  const resultado: Screenshot[] = [];

  for (const arquivo of jpgs) {
    try {
      const buffer = await fs.readFile(path.join(dir, arquivo));
      resultado.push({
        nome: arquivo.replace(/\.(jpg|jpeg)$/i, ""),
        base64: buffer.toString("base64"),
      });
    } catch {
      // pula arquivos inacessíveis
    }
  }

  return resultado;
}
