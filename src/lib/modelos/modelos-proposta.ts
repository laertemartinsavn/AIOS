import path from "path";

export type ModeloProposta = {
  id: string;
  label: string;
  descricao: string;
  arquivo: string;
};

export const MODELOS_PROPOSTA: ModeloProposta[] = [
  {
    id: "body-shop",
    label: "Body Shop",
    descricao: "Alocação de profissionais por hora/mês",
    arquivo: "Modelo Body Shop.pdf",
  },
  {
    id: "projeto-fechado-nao-sap",
    label: "Projeto Fechado (não SAP)",
    descricao: "Escopo fechado para projetos fora do ecossistema SAP",
    arquivo: "Modelo Projeto Fechado Não SAP.pdf",
  },
  {
    id: "projeto-fechado-sap",
    label: "Projeto Fechado SAP",
    descricao: "Escopo fechado para projetos SAP",
    arquivo: "Modelo Projeto Fechado SAP.pdf",
  },
  {
    id: "squad-gerenciada",
    label: "Squad Gerenciada",
    descricao: "Time dedicado com gestão inclusa",
    arquivo: "Modelo Squad Gerenciada.pdf",
  },
];

export function encontrarModelo(id: string): ModeloProposta | undefined {
  return MODELOS_PROPOSTA.find((m) => m.id === id);
}

export function caminhoModelo(modelo: ModeloProposta): string {
  return path.join(process.cwd(), "Modelos", modelo.arquivo);
}
