"use client";

import { useEffect, useState } from "react";

interface Props {
  ativo: boolean;
  estimadoSegundos: number;
  label?: string;
}

export function BarraProgressoIA({ ativo, estimadoSegundos, label }: Props) {
  const [passados, setPassados] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setPassados(0);
      return;
    }
    const id = setInterval(() => setPassados((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  if (!ativo) return null;

  const pct = Math.min(95, (passados / estimadoSegundos) * 100);
  const faltam = Math.max(0, estimadoSegundos - passados);
  const tempo = faltam > 0 ? `~${faltam}s restantes` : "Finalizando…";

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="text-center text-[12px] text-[#797C7F]">{label}</p>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#EBECF7]">
        <div
          className="h-full rounded-full bg-[#3D4392] transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-[11px] tabular-nums text-[#A9ABAE]" role="status" aria-live="polite">
        {tempo}
      </p>
    </div>
  );
}
