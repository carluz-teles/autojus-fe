"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getGoldPreview,
  getGoldRevision,
  goldKeys,
  listGoldCandidates,
} from "../../services/annotation-gold";
export function useGoldCandidates(allowed: boolean) {
  const api = useApi();
  const query = useInfiniteQuery({
    queryKey: [...goldKeys.all, "candidates"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listGoldCandidates(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function refresh() {
    if (allowed) void query.refetch();
  }
  function more() {
    if (allowed && !query.isFetching) void query.fetchNextPage();
  }
  return {
    query,
    items: query.data?.pages.flatMap((p) => p.data) ?? [],
    refresh,
    more,
  };
}
export function useGoldPreviewQuery(id: string, allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: goldKeys.preview(id),
    queryFn: ({ signal }) => getGoldPreview(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
  });
}
export function useGoldRevisionQuery(id: string, allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: goldKeys.revision(id),
    queryFn: ({ signal }) => getGoldRevision(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
  });
}
