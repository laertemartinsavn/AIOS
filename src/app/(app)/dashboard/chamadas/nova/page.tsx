import { FormNovaChamada } from "@/components/chamadas/form-nova";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NovaChamadaPage() {
  return (
    <div className="p-7">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="font-brand text-[20px] font-bold tracking-tight text-[#1F2255]">
            Nova análise
          </h2>
          <p className="mt-1 text-[13px] text-[#797C7F]">
            Gere a análise a partir da transcrição de uma call ou de anotações da reunião.
          </p>
        </div>

        <div className="rounded-2xl border border-[#D8DAF0] bg-white p-[28px] shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
          <FormNovaChamada />
        </div>
      </div>
    </div>
  );
}
