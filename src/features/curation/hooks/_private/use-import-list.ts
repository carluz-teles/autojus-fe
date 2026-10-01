"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listImports } from "../../services/imports";

export function useImportList(enabled: boolean) {
  const api = useApi();
  const query = useInfiniteQuery({
    queryKey: ["curation", "imports"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listImports(api, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled,
    retry: false,
    staleTime: 0,
  });
  function loadMore() {
    void query.fetchNextPage();
  }
  function refresh() {
    void query.refetch();
  }
  return {
    ...query,
    batches: query.data?.pages.flatMap((page) => page.data) ?? [],
    loadMore,
    refresh,
  };
}
