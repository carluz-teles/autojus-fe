"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listIntimacoes } from "../services/intimacoes.service";

const INTIMACOES_KEY = ["intimacoes", "list"] as const;
const PAGE_LIMIT = 20;

/**
 * Hook público da feature — inbox de intimações, leitura paginada por cursor via
 * React Query. next_cursor null = última página.
 */
export function useIntimacoes() {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: INTIMACOES_KEY,
    queryFn: ({ pageParam }) =>
      listIntimacoes(fetcher, { limit: PAGE_LIMIT, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.next_cursor ?? undefined,
  });

  const intimacoes = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    intimacoes,
    isPending: query.isPending,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
