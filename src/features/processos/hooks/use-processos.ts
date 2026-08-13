"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { listProcessos } from "../services/processos.service";

/**
 * Hook público da feature — leitura paginada por cursor (prev/próxima), busca
 * server-side (debounce) e totais "X de Y", tudo via React Query. O componente só
 * consome este; nenhum estado de paginação vive na página.
 */
export function useProcessos() {
  const fetcher = useApi();
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 400);

  // A pilha de cursores reseta quando o filtro (busca + lifecycle + página) muda.
  const pagination = useCursorPagination(
    `${debouncedSearch} ${lifecycle ?? ""} ${pageSize}`,
  );

  const query = useQuery({
    queryKey: [
      "processos",
      "list",
      {
        search: debouncedSearch,
        lifecycle,
        limit: pageSize,
        cursor: pagination.activeCursor,
      },
    ],
    queryFn: () =>
      listProcessos(fetcher, {
        limit: pageSize,
        cursor: pagination.activeCursor,
        search: debouncedSearch || undefined,
        lifecycle: lifecycle || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;

  return {
    processos: query.data?.data ?? [],
    totalCount: query.data?.page.total_count ?? 0,
    total: query.data?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // busca
    search,
    setSearch,
    // filtro por lifecycle (dirigido pelos KpiCards clicáveis)
    lifecycle,
    setLifecycle,
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
