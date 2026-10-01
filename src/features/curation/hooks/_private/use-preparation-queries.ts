"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getActCatalog,
  getPreparedBatch,
  getProtocol,
  listPreparedBatches,
  listProtocols,
  preparationKeys,
} from "../../services/annotation-preparation";
import { listSamplingFrames } from "../../services/sampling";

export function usePreparationLists(allowed: boolean) {
  const api = useApi();
  const protocols = useInfiniteQuery({
    queryKey: [...preparationKeys.all, "protocols"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listProtocols(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const batches = useInfiniteQuery({
    queryKey: [...preparationKeys.all, "batches"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listPreparedBatches(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const frames = useInfiniteQuery({
    queryKey: ["curation", "sampling-frames"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listSamplingFrames(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function refresh() {
    if (!allowed) return;
    void protocols.refetch();
    void batches.refetch();
    void frames.refetch();
  }
  function moreProtocols() {
    void protocols.fetchNextPage();
  }
  function moreBatches() {
    void batches.fetchNextPage();
  }
  function moreFrames() {
    void frames.fetchNextPage();
  }
  return {
    protocols,
    batches,
    frames,
    protocolItems: protocols.data?.pages.flatMap((p) => p.data) ?? [],
    batchItems: batches.data?.pages.flatMap((p) => p.data) ?? [],
    frameItems: frames.data?.pages.flatMap((p) => p.data) ?? [],
    refresh,
    moreProtocols,
    moreBatches,
    moreFrames,
  };
}
export function useProtocolQuery(id: string, allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: preparationKeys.protocol(id),
    queryFn: ({ signal }) => getProtocol(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
  });
}
export function useProtocolCatalog(allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: [...preparationKeys.all, "catalog"],
    queryFn: ({ signal }) => getActCatalog(api, signal),
    enabled: allowed,
    retry: false,
  });
}
export function usePreparedBatchQuery(id: string, allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: preparationKeys.batch(id),
    queryFn: ({ signal }) => getPreparedBatch(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.valid === false || q.state.status === "error"
        ? false
        : 30000,
  });
}
