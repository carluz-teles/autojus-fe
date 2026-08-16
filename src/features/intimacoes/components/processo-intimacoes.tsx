"use client";

import { Gavel } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import { useIntimacoesDoProcesso } from "../hooks/use-intimacoes-do-processo";
import type { IntimacaoType } from "../types";

const TYPE_LABEL: Record<IntimacaoType, string> = {
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  COMUNICACAO: "Comunicação",
};

// Aba "Intimações" do processo: tabela por processo (tipo / situação / datas /
// teor). As colunas de IA (classificação, confiança, "crítica", providência)
// chegam na Fase 3 — aqui ficam como cabeçalho placeholder. Só JSX + binding.
export function ProcessoIntimacoes({ processoId }: { processoId: string }) {
  const { intimacoes, isPending, isError, error } =
    useIntimacoesDoProcesso(processoId);

  if (isPending) {
    return (
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
        {error instanceof ApiError
          ? error.message
          : "Erro ao carregar as intimações."}
      </p>
    );
  }

  if (intimacoes.length === 0) {
    return (
      <EmptyState
        icon={Gavel}
        title="Nenhuma intimação vinculada"
        description="As publicações (DJEN) capturadas para este processo aparecem aqui. A classificação por IA e a sugestão de providência chegam na Fase 3."
        phase="IA na Fase 3"
      />
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Situação</th>
            <th className="px-4 py-3 font-medium">Disponibilização</th>
            <th className="px-4 py-3 font-medium">Publicação</th>
            <th className="px-4 py-3 font-medium">Teor</th>
            <th
              className="text-gold/70 px-4 py-3 font-medium"
              title="Classificação por IA — Fase 3"
            >
              Classificação IA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {intimacoes.map((i) => (
            <tr key={i.id} className="hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3">
                <Badge variant="secondary">
                  {TYPE_LABEL[i.type] ?? i.type}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={i.status === "CANCELLED" ? "outline" : "default"}
                >
                  {i.status === "CANCELLED" ? "Cancelada" : "Ativa"}
                </Badge>
              </td>
              <td className="text-muted-foreground px-4 py-3 tabular-nums">
                {formatDate(i.made_available_at)}
              </td>
              <td className="text-muted-foreground px-4 py-3 tabular-nums">
                {formatDate(i.published_at)}
              </td>
              <td className="text-muted-foreground max-w-md px-4 py-3">
                <Link
                  href={`/intimacoes/${i.id}`}
                  className="hover:text-gold line-clamp-2 hover:underline"
                >
                  {i.content_preview || "Ver intimação"}
                </Link>
              </td>
              <td className="text-muted-foreground/50 px-4 py-3 text-xs italic">
                Em breve
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
