"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listAutosTree } from "../../services/documentos.service";

const processing = new Set(["UPLOADED", "EXTRACTING", "EXTRACTED", "CHUNKED"]);

export function useAutosTreeQuery(
  processoId: string,
  search: string,
  order: "newest" | "oldest",
) {
  const fetcher = useApi();
  return useInfiniteQuery({
    queryKey: ["documentos", "autos", processoId, search, order],
    queryFn: ({ pageParam }) =>
      listAutosTree(fetcher, {
        processoId,
        search,
        order,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: !!processoId,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.data.some((node) =>
          node.documents.some((doc) => processing.has(doc.status)),
        ),
      )
        ? 4000
        : false,
  });
}
