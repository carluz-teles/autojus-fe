"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listProcessos } from "../services/processos.service";

const PROCESSOS_KEY = ["processos", "list"] as const;
const PAGE_LIMIT = 20;

/**
 * Hook público da feature — leitura paginada por cursor via React Query.
 * O componente só chama este; a paginação ("carregar mais") é o next_cursor
 * ecoado de volta ao BE. next_cursor null = última página.
 */
export function useProcessos() {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: PROCESSOS_KEY,
    queryFn: ({ pageParam }) =>
      listProcessos(fetcher, { limit: PAGE_LIMIT, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.next_cursor ?? undefined,
  });

  const processos = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    processos,
    isPending: query.isPending,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
