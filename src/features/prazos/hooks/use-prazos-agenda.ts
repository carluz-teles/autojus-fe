"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";

import { listPrazos } from "../services/prazos.service";
import type { PrazoStatus } from "../types";

/** "" = todos os status; caso contrário filtra server-side pelo status do prazo. */
export type PrazoStatusFilter = "" | PrazoStatus;

/**
 * Hook público da agenda global — próximos vencimentos por cursor (prev/próxima),
 * filtro por status e totais "X de Y". Espelha useProcessos, trocando a busca por
 * um filtro de status; o componente só consome este.
 */
export function usePrazosAgenda() {
  const fetcher = useApi();
  const [status, setStatus] = useState<PrazoStatusFilter>("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // A pilha de cursores reseta quando o filtro (status + tamanho de página) muda.
  const pagination = useCursorPagination(`${status} ${pageSize}`);

  const query = useQuery({
    queryKey: [
      "prazos",
      "agenda",
      {
        status,
        limit: pageSize,
        cursor: pagination.activeCursor,
      },
    ],
    queryFn: () =>
      listPrazos(fetcher, {
        status: status || undefined,
        limit: pageSize,
        cursor: pagination.activeCursor,
      }),
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;

  return {
    prazos: query.data?.data ?? [],
    totalCount: query.data?.page.total_count ?? 0,
    total: query.data?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // filtro
    status,
    setStatus,
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
