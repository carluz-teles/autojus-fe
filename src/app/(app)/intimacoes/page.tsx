import { ArrowUpDown, CheckCircle2, Filter, Printer } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

// Prévia (layout de referência): a inbox das intimações capturadas do DJEN.
// Espelha o print do ADVBOX adaptado ao AtJud — colunas e dados são exemplo até
// a fatia DJEN alimentar de verdade (intimation → read model).
const SAMPLE = [
  {
    id: "1",
    partes: "PAULO DA SILVA PROLHETI FRANCA ME × THAYLA LAIS CARMOZINE",
    publicacao: "04/08/2026",
    tribunal: "TJSP",
    numero: "0005746-66.2025.8.26.0196",
    situacao: "Pendente",
  },
  {
    id: "2",
    partes: "PAULO DA SILVA PROLHETI FRANCA ME × JOSÉ CARLOS NEVES",
    publicacao: "04/08/2026",
    tribunal: "TJSP",
    numero: "0004597-35.2025.8.26.0196",
    situacao: "Pendente",
  },
  {
    id: "3",
    partes: "VANIA MAGALHAES RAUTA × MURILO DE PAULA BALDAN PROMOÇÕES ME",
    publicacao: "04/08/2026",
    tribunal: "TJSP",
    numero: "1021828-92.2024.8.26.0196",
    situacao: "Analisada",
  },
];

export default function IntimacoesPage() {
  return (
    <>
      <PageHeader
        title="Intimações"
        description="Publicações capturadas do DJEN pelas OABs monitoradas."
        action={<Badge variant="outline">Prévia</Badge>}
      />

      <div className="reveal mt-6 flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="font-medium">Todos os termos sincronizados</span>
        <span className="ml-auto text-xs text-emerald-700/70 dark:text-emerald-400/70">
          Atualizado às 14:39
        </span>
      </div>

      <div className="reveal mt-4 flex flex-wrap items-center gap-2">
        <FilterChip>Hoje</FilterChip>
        <FilterChip>Responsável</FilterChip>
        <FilterChip icon={Filter}>Filtrar</FilterChip>
        <FilterChip icon={ArrowUpDown}>Ordenar</FilterChip>
        <FilterChip icon={Printer}>Imprimir</FilterChip>
      </div>

      <div className="reveal bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Processo</th>
              <th className="px-5 py-3 font-medium">Publicação</th>
              <th className="px-5 py-3 font-medium">Tribunal</th>
              <th className="px-5 py-3 font-medium">Nº do processo</th>
              <th className="px-5 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SAMPLE.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-4">
                  <Link
                    href={`/intimacoes/${row.id}`}
                    className="hover:text-gold font-medium underline-offset-4 hover:underline"
                  >
                    {row.partes}
                  </Link>
                </td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.publicacao}
                </td>
                <td className="text-muted-foreground px-5 py-4">
                  {row.tribunal}
                </td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.numero}
                </td>
                <td className="px-5 py-4">
                  <Badge
                    variant={
                      row.situacao === "Pendente" ? "secondary" : "default"
                    }
                  >
                    {row.situacao}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterChip({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      disabled
      className="text-muted-foreground bg-card inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </button>
  );
}
