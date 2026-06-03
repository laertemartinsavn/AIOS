import type { Relatorio } from "@/lib/types/entities";

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export function PainelAnalise({ relatorio }: { relatorio: Relatorio }) {
  const dores = asArray(relatorio.dores_identificadas);
  const objecoes = asArray(relatorio.objecoes);
  const proximos = asArray(relatorio.proximos_passos);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Resumo executivo */}
      {relatorio.resumo_executivo && (
        <Section
          icon={<FileIcon />}
          title="Resumo executivo"
        >
          <p className="text-[13.5px] leading-relaxed text-[#44464A]">
            {relatorio.resumo_executivo}
          </p>
        </Section>
      )}

      {/* BANT */}
      <Section icon={<ClockIcon />} title="Qualificação BANT" sub="Extraído automaticamente">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BantCard title="Budget" icon={<DollarIcon />} value={relatorio.bant_budget} />
          <BantCard title="Autoridade" icon={<UserIcon />} value={relatorio.bant_autoridade} />
          <BantCard title="Necessidade" icon={<CheckCircleIcon />} value={relatorio.bant_necessidade} />
          <BantCard title="Prazo" icon={<CalendarIcon />} value={relatorio.bant_prazo} />
        </div>
      </Section>

      {/* Dores */}
      {dores.length > 0 && (
        <Section
          icon={<AlertCircleIcon />}
          title="Dores identificadas"
          sub={`${dores.length} ${dores.length === 1 ? "item" : "itens"}`}
        >
          <div className="flex flex-wrap gap-2">
            {dores.map((d, i) => (
              <span
                key={i}
                className="rounded-full bg-[rgba(242,139,58,.12)] px-3 py-1 text-[12px] font-medium text-[#B05E1F]"
              >
                {d}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Objeções */}
      {objecoes.length > 0 && (
        <Section
          icon={<MessageIcon />}
          title="Objeções"
          sub={`${objecoes.length} ${objecoes.length === 1 ? "item" : "itens"}`}
        >
          <div className="flex flex-wrap gap-2">
            {objecoes.map((o, i) => (
              <span
                key={i}
                className="rounded-full bg-[#D2EEF9] px-3 py-1 text-[12px] font-medium text-[#0780AC]"
              >
                {o}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Próximos passos */}
      {proximos.length > 0 && (
        <Section
          icon={<CheckboxIcon />}
          title="Próximos passos"
          sub={`${proximos.length} ${proximos.length === 1 ? "item" : "itens"}`}
        >
          <div className="flex flex-col gap-2">
            {proximos.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#D8DAF0] bg-white text-[10px] font-brand font-semibold text-[#797C7F]">
                  {i + 1}
                </div>
                <span className="text-[13px] leading-snug text-[#44464A]">{p}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Análise completa (conteúdo narrativo) */}
      {relatorio.conteudo && (
        <Section icon={<FileIcon />} title="Análise completa">
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#44464A]">
            {relatorio.conteudo}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─── Card wrappers ──────────────────────────────────────────── */

function Section({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D8DAF0] bg-white p-[22px] shadow-[0_4px_12px_rgba(31,34,85,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBECF7] text-[#3D4392] [&>svg]:h-3.5 [&>svg]:w-3.5">
            {icon}
          </span>
          <span className="font-brand text-[14px] font-semibold text-[#1F2255]">{title}</span>
        </div>
        {sub && <span className="text-[12px] text-[#797C7F]">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function BantCard({
  title,
  icon,
  value,
}: {
  title: string;
  icon: React.ReactNode;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#EBECF7] bg-[#F4F5FB] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center text-[#3D4392] [&>svg]:h-full [&>svg]:w-full [&>svg]:[stroke-width:2]">
          {icon}
        </span>
        <span className="font-brand text-[12px] font-semibold text-[#1F2255]">{title}</span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-[#44464A]">
        {value ?? (
          <span className="italic text-[#A9ABAE]">Não discutido na análise</span>
        )}
      </p>
    </div>
  );
}

/* ─── Inline icons ───────────────────────────────────────────── */

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CheckboxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
