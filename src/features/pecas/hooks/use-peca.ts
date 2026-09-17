"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listPecasByProcesso } from "../services/pecas.service";

// Única sobrevivente do antigo hook de Peça v1: lista as peças de um processo
// (consumida pelo hub de processo em prazos). O restante do fluxo de peça vive
// em features/pecas-v2.
const byProcessKey = (processoId: string) =>
  ["pecas", "by-process", processoId] as const;

export function usePecasByProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: byProcessKey(processoId),
    queryFn: ({ pageParam }) =>
      listPecasByProcesso(fetcher, {
        processoId,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    enabled: !!processoId,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    items,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
