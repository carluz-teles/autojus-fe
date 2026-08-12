"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { listIntimacoes } from "../services/intimacoes.service";

/**
 * Hook público da feature — inbox de intimações: leitura por cursor (prev/próxima),
 * busca server-side (debounce por cnj_number) e totais "X de Y". Espelha useProcessos.
 */
export function useIntimacoes() {
  const fetcher = useApi();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 400);

  const pagination = useCursorPagination(`${debouncedSearch} ${pageSize}`);

  const query = useQuery({
    queryKey: [
      "intimacoes",
      "list",
      {
        search: debouncedSearch,
        limit: pageSize,
        cursor: pagination.activeCursor,
      },
    ],
    queryFn: () =>
      listIntimacoes(fetcher, {
        limit: pageSize,
        cursor: pagination.activeCursor,
        search: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;

  return {
    intimacoes: query.data?.data ?? [],
    totalCount: query.data?.page.total_count ?? 0,
    total: query.data?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // busca
    search,
    setSearch,
    // paginação
    pageSize,
    setPageSize,
    pageNumber: pagination.pageNumber,
    canPrev: pagination.canPrev,
    canNext: nextCursor !== null,
    onPrev: pagination.prev,
    onNext: () => {
      if (nextCursor) pagination.next(nextCursor);
    },
  };
}
