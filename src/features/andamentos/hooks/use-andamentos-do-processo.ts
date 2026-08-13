"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listAndamentosByProcesso } from "../services/andamentos.service";

const PAGE_SIZE = 30;

/**
 * Linha do tempo de andamentos do processo — cursor DESC via useInfiniteQuery
 * (v5): as páginas acumulam num único fluxo cronológico e "Carregar mais" pede a
 * próxima pelo next_cursor. A derivação (flatten) fica no hook, nunca no
 * componente. Desligado enquanto `processoId` for vazio.
 */
export function useAndamentosDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: ["andamentos", "processo", processoId],
    queryFn: ({ pageParam }) =>
      listAndamentosByProcesso(fetcher, {
        processoId,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    enabled: !!processoId,
  });

  const andamentos = query.data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = query.data?.pages[0]?.page.total_count ?? 0;

  return {
    andamentos,
    totalCount,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
