"use client";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { candidateKeys, getCandidate } from "../../services/candidates";
import {
  closedKeys,
  closedTestPoll,
  getClosedMetadata,
  getClosedReservation,
  getClosedRun,
} from "../../services/closed-tests";
import { getRelease, releaseKeys } from "../../services/dataset-releases";

function fresh(q: { isSuccess: boolean; isFetching: boolean }) {
  return q.isSuccess && !q.isFetching;
}
export function useClosedTestQueries(id: string, allowed: boolean) {
  const api = useApi();
  const candidate = useQuery({
    queryKey: candidateKeys.detail(id),
    queryFn: ({ signal }) => getCandidate(api, id, signal),
    enabled: allowed,
    retry: false,
  });
  const reservation = useQuery({
    queryKey: closedKeys.reservation(id),
    queryFn: ({ signal }) => getClosedReservation(api, id, signal),
    enabled: allowed,
    retry: false,
  });
  const releaseID = candidate.data?.document.release_id ?? "";
  const release = useQuery({
    queryKey: releaseKeys.detail(releaseID),
    queryFn: ({ signal }) => getRelease(api, releaseID, signal),
    enabled: allowed && fresh(candidate) && !!releaseID,
    retry: false,
  });
  const baseFresh = allowed && fresh(candidate) && fresh(reservation);
  const reservationID = reservation.data?.id ?? "";
  const run = useQuery({
    queryKey: closedKeys.run(reservationID),
    queryFn: ({ signal }) => getClosedRun(api, reservationID, signal),
    enabled: baseFresh && !!reservationID,
    retry: false,
    refetchInterval: (q) =>
      baseFresh ? closedTestPoll(q.state.data, q.state.status) : false,
  });
  const runFresh =
    baseFresh &&
    fresh(run) &&
    !!reservationID &&
    (run.data === null ||
      run.data?.definition_digest === reservation.data?.preview.digest);
  const runID = run.data?.id ?? "";
  const metadataEnabled =
    runFresh && !!run.data?.finished_at && run.data.report_available;
  const metadata = useQuery({
    queryKey: closedKeys.report(runID),
    queryFn: ({ signal }) =>
      getClosedMetadata(api, runID, reservationID, signal),
    enabled: metadataEnabled,
    retry: false,
  });
  async function refresh() {
    if (!allowed) return;
    await Promise.all([
      candidate.refetch(),
      reservation.refetch(),
      ...(releaseID ? [release.refetch()] : []),
      ...(reservationID ? [run.refetch()] : []),
      ...(metadataEnabled ? [metadata.refetch()] : []),
    ]);
  }
  const context = `${id}:${candidate.dataUpdatedAt}:${release.dataUpdatedAt}:${reservation.dataUpdatedAt}`;
  return {
    candidate,
    reservation,
    release,
    run,
    metadata,
    baseFresh,
    runFresh,
    releaseFresh: baseFresh && fresh(release),
    metadataFresh:
      metadataEnabled &&
      fresh(metadata) &&
      (metadata.data === null ||
        metadata.data?.definition_digest === run.data?.definition_digest),
    context,
    refresh,
  };
}
