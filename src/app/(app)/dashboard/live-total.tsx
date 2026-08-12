"use client";

import { useQuery } from "@tanstack/react-query";

import { listIntimacoes } from "@/features/intimacoes/services/intimacoes.service";
import { listProcessos } from "@/features/processos/services/processos.service";
import { useApi } from "@/lib/api/use-api";
import { formatCount } from "@/lib/format";

/**
 * Valor de um card do dashboard: o total real do tenant lido do envelope (page.total),
 * pedindo só 1 item (limit=1) — reusa o endpoint de lista, sem endpoint dedicado.
 */
export function LiveTotal({ kind }: { kind: "processos" | "intimacoes" }) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: [kind, "total"],
    queryFn: async () => {
      const res =
        kind === "processos"
          ? await listProcessos(fetcher, { limit: 1 })
          : await listIntimacoes(fetcher, { limit: 1 });
      return res.page.total;
    },
  });

  if (query.isPending || query.error) return <>—</>;
  return <>{formatCount(query.data)}</>;
}
