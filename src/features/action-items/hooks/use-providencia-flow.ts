"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { getFilingAttempt } from "@/features/filing/service";
import { useApi } from "@/lib/api/use-api";

import type {
  FlowDraft,
  FlowEvidence,
  FlowPreparation,
} from "../lib/providencia-flow";
import type { ActionItemView } from "../types";

/** Only GETs, scoped to the active identity. Never starts preparation or filing. */
export function useProvidenciaFlow(p: ActionItemView) {
  const api = useApi();
  const { orgId, userId } = useAuth();
  const id = p.draft_id ?? "";
  const enabled = Boolean(id && orgId && userId);
  const key = ["providencia-flow", orgId, userId, id];
  const draft = useQuery({
    queryKey: [...key, "draft"],
    queryFn: async ({ signal }) =>
      (await api<{ data: FlowDraft }>(`/v1/pecas/${id}`, { signal })).data,
    enabled,
    refetchInterval: (q) =>
      q.state.data?.saga_state === "EXTRACTING" ? 5000 : false,
  });
  const filing = useQuery({
    queryKey: [...key, "filing"],
    queryFn: ({ signal }) => getFilingAttempt(api, id, signal),
    enabled,
    refetchInterval: (q) =>
      ["ENFILEIRADO", "PROTOCOLANDO"].includes(q.state.data?.status ?? "")
        ? 5000
        : false,
  });
  const preparation = useQuery({
    queryKey: [...key, "preparation"],
    queryFn: async ({ signal }) =>
      (
        await api<{ data: FlowPreparation | null }>(
          `/v1/pecas/${id}/filing/preparation`,
          { signal },
        )
      ).data,
    enabled,
    refetchInterval: (q) =>
      ["QUEUED", "PREPARING"].includes(q.state.data?.status ?? "")
        ? 5000
        : false,
  });
  const evidence: FlowEvidence = {
    draft: draft.data,
    filing: filing.data,
    preparation: preparation.data,
    loading:
      enabled && (draft.isPending || filing.isPending || preparation.isPending),
    unavailable:
      enabled && (draft.isError || filing.isError || preparation.isError),
  };
  return {
    evidence,
    refreshing: draft.isFetching || filing.isFetching || preparation.isFetching,
    refresh: () => {
      if (enabled)
        void Promise.all([
          draft.refetch(),
          filing.refetch(),
          preparation.refetch(),
        ]);
    },
  };
}
