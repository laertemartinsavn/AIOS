import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarBRL } from "@/lib/ui/cores";

type Props = {
  total: number;
  analisadas: number;
  propostas: number;
  valorEstimadoTotal: number;
};

export function StatsCards({
  total,
  analisadas,
  propostas,
  valorEstimadoTotal,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Análises" valor={total.toString()} />
      <StatCard label="Analisadas" valor={analisadas.toString()} />
      <StatCard label="Propostas" valor={propostas.toString()} />
      <StatCard label="Valor estimado total" valor={formatarBRL(valorEstimadoTotal)} />
    </div>
  );
}

function StatCard({ label, valor }: { label: string; valor: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      </CardContent>
    </Card>
  );
}
