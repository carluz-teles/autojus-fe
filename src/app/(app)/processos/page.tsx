import { Archive, CheckCircle2, Scale } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Prévia (layout de referência): lista de processos consolidados (court_case /
// court_record). Adaptada do print de Processos do ADVBOX.
const STATS = [
  { label: "Processos ativos", value: "—", icon: Scale },
  { label: "Fechamentos no mês", value: "—", icon: CheckCircle2 },
  { label: "Arquivados no mês", value: "—", icon: Archive },
];

const SAMPLE = [
  {
    id: "1",
    partes: "PAULO DA SILVA PROLHETI FRANCA ME × ADRIANA ALVES SANTANA",
    tipo: "Cumprimento de sentença",
    numero: "0007873-50.2020.8.26.0196",
    cadastro: "17/11/2021",
    andamento: "Intimação — 04/08/2026",
  },
  {
    id: "2",
    partes: "P A PROLHETI LTDA ME × ADALEIA APARECIDA DE OLIVEIRA",
    tipo: "Execução de título extrajudicial",
    numero: "4001642-60.2025.8.26.0196",
    cadastro: "25/08/2025",
    andamento: "—",
  },
];

export default function ProcessosPage() {
  return (
    <>
      <PageHeader
        title="Processos"
        description="Processos consolidados a partir da captura e do enriquecimento."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Prévia</Badge>
            <Button size="sm" disabled>
              Novo processo
            </Button>
          </div>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className="reveal bg-card rounded-xl border p-5 shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{label}</span>
              <Icon className="text-gold size-4" />
            </div>
            <p className="font-display mt-3 text-3xl leading-none tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </section>

      <div className="reveal bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 font-medium">Partes</th>
              <th className="px-5 py-3 font-medium">Tipo de ação</th>
              <th className="px-5 py-3 font-medium">Nº do processo</th>
              <th className="px-5 py-3 font-medium">Cadastro</th>
              <th className="px-5 py-3 font-medium">Último andamento</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SAMPLE.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-4">
                  <Link
                    href={`/processos/${row.id}`}
                    className="hover:text-gold font-medium underline-offset-4 hover:underline"
                  >
                    {row.partes}
                  </Link>
                </td>
                <td className="text-muted-foreground px-5 py-4">{row.tipo}</td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.numero}
                </td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.cadastro}
                </td>
                <td className="text-muted-foreground px-5 py-4">
                  {row.andamento}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
