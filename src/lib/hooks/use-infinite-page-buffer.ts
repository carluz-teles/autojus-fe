"use client";

import {
  type FetchNextPageOptions,
  hashKey,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

interface BufferedQuery<Page> {
  data?: { pages: Page[] };
  hasNextPage: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>;
}

/** Mantém a página n + 1 no cache nativo da infinite query, sem renderizá-la ainda. */
export function useInfinitePageBuffer<Page>(
  queryKey: QueryKey,
  query: BufferedQuery<Page>,
  enabled = true,
) {
  const key = hashKey(queryKey);
  const [window, setWindow] = useState({ key, count: 1 });
  // Filtros novos nunca herdam o número de páginas visíveis do recorte anterior.
  if (window.key !== key) setWindow({ key, count: 1 });
  const visibleCount = window.key === key ? window.count : 1;
  const {
    data,
    hasNextPage,
    isFetching,
    isPlaceholderData,
    isError,
    fetchNextPage,
  } = query;
  const pageCount = data?.pages.length ?? 0;
  const hasBufferedPage = pageCount > visibleCount;
  const ready = enabled && !isPlaceholderData;

  useEffect(() => {
    if (
      ready &&
      pageCount > 0 &&
      !hasBufferedPage &&
      hasNextPage &&
      !isFetching &&
      !isError
    ) {
      // Não cancela refetches nem reinicia uma requisição concorrente.
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [
    ready,
    pageCount,
    hasBufferedPage,
    hasNextPage,
    isFetching,
    isError,
    fetchNextPage,
  ]);

  const loadMore = useCallback(() => {
    if (isPlaceholderData) return;
    if (enabled && hasBufferedPage) {
      setWindow((previous) => ({
        key,
        // Callbacks repetidos do observer revelam no máximo uma página por render.
        count: Math.min(previous.count + 1, visibleCount + 1, pageCount),
      }));
    } else if (hasNextPage && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [
    enabled,
    hasBufferedPage,
    key,
    visibleCount,
    pageCount,
    hasNextPage,
    isFetching,
    isPlaceholderData,
    fetchNextPage,
  ]);

  const pages = useMemo(
    () =>
      enabled
        ? (data?.pages.slice(0, visibleCount) ?? [])
        : (data?.pages ?? []),
    [data?.pages, enabled, visibleCount],
  );

  return {
    pages,
    paginationKey: key,
    hasMore: hasNextPage || (enabled && hasBufferedPage),
    loadMore,
  };
}
