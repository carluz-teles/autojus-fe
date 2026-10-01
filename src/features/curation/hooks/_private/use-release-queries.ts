"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getRelease,
  getReleasePreview,
  listDownloads,
  listPublicationBatches,
  listPublicationJobs,
  listReleases,
  publicationPoll,
  releaseKeys,
} from "../../services/dataset-releases";
export function useReleaseLists(allowed: boolean) {
  const api = useApi();
  const batches = useInfiniteQuery({
    queryKey: [...releaseKeys.all, "batches"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listPublicationBatches(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const releases = useInfiniteQuery({
    queryKey: [...releaseKeys.all, "list"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listReleases(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function refresh() {
    if (allowed) {
      void batches.refetch();
      void releases.refetch();
    }
  }
  function moreBatches() {
    if (allowed && !batches.isFetching) void batches.fetchNextPage();
  }
  function moreReleases() {
    if (allowed && !releases.isFetching) void releases.fetchNextPage();
  }
  return {
    batches,
    releases,
    batchItems: batches.data?.pages.flatMap((p) => p.data) ?? [],
    releaseItems: releases.data?.pages.flatMap((p) => p.data) ?? [],
    refresh,
    moreBatches,
    moreReleases,
  };
}
export function useReleasePreviewQuery(
  batch: string,
  purpose: string,
  allowed: boolean,
) {
  const api = useApi();
  return useQuery({
    queryKey: releaseKeys.preview(batch, purpose),
    queryFn: ({ signal }) => getReleasePreview(api, batch, purpose, signal),
    enabled: allowed && !!batch,
    retry: false,
  });
}
export function useReleaseDetailQueries(id: string, allowed: boolean) {
  const api = useApi();
  const release = useQuery({
    queryKey: releaseKeys.detail(id),
    queryFn: ({ signal }) => getRelease(api, id, signal),
    enabled: allowed,
    retry: false,
  });
  const jobs = useQuery({
    queryKey: releaseKeys.jobs(id),
    queryFn: ({ signal }) => listPublicationJobs(api, id, signal),
    enabled: allowed,
    retry: false,
    refetchInterval: (q) => publicationPoll(q.state.data, q.state.status),
  });
  const deliveries = useInfiniteQuery({
    queryKey: releaseKeys.deliveries(id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listDownloads(api, id, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function refresh() {
    if (allowed) {
      void release.refetch();
      void jobs.refetch();
      void deliveries.refetch();
    }
  }
  function moreDeliveries() {
    if (allowed && !deliveries.isFetching) void deliveries.fetchNextPage();
  }
  return {
    release,
    jobs,
    deliveries,
    deliveryItems: deliveries.data?.pages.flatMap((p) => p.data) ?? [],
    refresh,
    moreDeliveries,
  };
}
