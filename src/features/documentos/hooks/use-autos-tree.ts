"use client";

import { useDeferredValue, useMemo } from "react";

import type { OpenDocument } from "../components/pdf-drawer";
import { useAutosTreeFilters } from "./_private/use-autos-tree-filters";
import { useAutosTreeQuery } from "./_private/use-autos-tree-query";
import { useAutosTreeSelection } from "./_private/use-autos-tree-selection";

export function useAutosTree(
  processoId: string,
  setOpenDocument: (doc: OpenDocument | null) => void,
) {
  const filters = useAutosTreeFilters();
  const search = useDeferredValue(filters.search.trim());
  const query = useAutosTreeQuery(processoId, search, filters.order);
  const nodes = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  const selection = useAutosTreeSelection(nodes, setOpenDocument);
  const firstPage = query.data?.pages[0];

  return {
    ...filters,
    ...selection,
    nodes,
    total: firstPage?.document_total ?? 0,
    filteredTotal: firstPage?.document_filtered_total ?? 0,
    filteredNodes: firstPage?.page.total_count ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
  };
}

export type AutosTreeState = ReturnType<typeof useAutosTree>;
