"use client";

import { ArrowUpDown, CheckCircle2, Filter, Printer } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoStatus } from "@/features/intimacoes/types";

// Inbox das intimações capturadas do DJEN pelas OABs monitoradas. Dados reais via
// GET /v1/intimacoes (intimation → read model do BE).

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<IntimacaoStatus, string> = {
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export default function IntimacoesPage() {
  const {
    intimacoes,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useIntimacoes();

  return (
    <>
      <PageHeader
        title="Intimações"
        description="Publicações capturadas do DJEN pelas OABs monitoradas."
      />

      <ImportBanner />

      <div className="reveal mt-6 flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="font-medium">
          {isPending
            ? "Sincronizando…"
            : `${intimacoes.length} intimações carregadas`}
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
              <th className="px-5 py-3 font-medium">Nº do processo</th>
              <th className="px-5 py-3 font-medium">Publicação</th>
              <th className="px-5 py-3 font-medium">Tribunal / grau</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Início do prazo</th>
              <th className="px-5 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isPending ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  Carregando intimações…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-red-600">
                  Erro ao carregar intimações.
                </td>
              </tr>
            ) : intimacoes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  Nenhuma intimação capturada ainda.
                </td>
              </tr>
            ) : (
              intimacoes.map((it) => (
                <tr key={it.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-4 tabular-nums">
                    <Link
                      href={`/intimacoes/${it.id}`}
                      className="hover:text-gold font-medium underline-offset-4 hover:underline"
                    >
                      {it.cnj_number}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-5 py-4 tabular-nums">
                    {fmtDate(it.made_available_at)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-muted-foreground">{it.court}</span>
                    <Badge variant="outline" className="ml-2">
                      {it.degree}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">{it.type}</td>
                  <td className="text-muted-foreground px-5 py-4 tabular-nums">
                    {fmtDate(it.deadline_start_at)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        it.status === "CANCELLED" ? "secondary" : "default"
                      }
                    >
                      {STATUS_LABEL[it.status] ?? it.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      ) : null}
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
