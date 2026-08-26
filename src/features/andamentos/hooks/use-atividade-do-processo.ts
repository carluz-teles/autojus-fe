"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listAtividadeDoProcesso } from "../services/atividade.service";

const PAGE_SIZE = 20;

/**
 * Atividade do escritório no processo (análise de intimação concluída, peça
 * gerada) — cursor DESC via useInfiniteQuery (v5), mesmo padrão de
 * useAndamentosDoProcesso. As páginas acumulam num único fluxo cronológico e
 * "Carregar mais" pede a próxima pelo next_cursor. Desligado enquanto
 * `processoId` for vazio.
 */
export function useAtividadeDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: ["atividade-do-escritorio", "processo", processoId],
    queryFn: ({ pageParam }) =>
      listAtividadeDoProcesso(fetcher, {
        processoId,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    enabled: !!processoId,
  });

  const atividades = query.data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = query.data?.pages[0]?.page.total_count ?? 0;

  return {
    atividades,
    totalCount,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
