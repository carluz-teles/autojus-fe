"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import type { Draft } from "../types";

export const draftKeys = {
  all: ["pecas-v2"] as const,
  detail: (id: string) => [...draftKeys.all, "detail", id] as const,
  assessment: (id: string) => [...draftKeys.all, "assessment", id] as const,
  chat: (id: string) => [...draftKeys.all, "chat", id] as const,
};

/** Persisted assessment state must be read before an empty draft auto-starts. */
export function useAssessment(id: string, enabled: boolean) {
  const fetcher = useApi();
  return useQuery({
    queryKey: draftKeys.assessment(id),
    queryFn: () => svc.getAssessment(fetcher, id),
    enabled: !!id && enabled,
    // The app defaults to 60s. A cached success must not skip the GET when
    // the draft loads and changes this query from disabled to enabled.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useDraft(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const detailKey = draftKeys.detail(id);
  const followup = useRef<{ version: string; startedAt: number } | null>(null);
  return useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      const atStart = qc.getQueryData<Draft>(detailKey);
      const incoming = await svc.getDraft(fetcher, id);
      const current = qc.getQueryData<Draft>(detailKey);
      if (current && current.id === incoming.id) {
        const currentAt = Date.parse(current.updatedAt);
        const incomingAt = Date.parse(incoming.updatedAt);
        // A response older than the cache, or a GET overtaken by a cache
        // update (such as a local save ack), cannot replace its body/revision.
        // Equal millisecond timestamps alone do not order two server versions.
        if (
          (current !== atStart ||
            (Number.isFinite(currentAt) &&
              Number.isFinite(incomingAt) &&
              currentAt > incomingAt)) &&
          (current.currentVersionId !== incoming.currentVersionId ||
            current.contentRevision !== incoming.contentRevision)
        )
          return current;
      }
      return incoming;
    },
    // Enquanto a geração está em curso (saga CREATED/EXTRACTING), o worker
    // já persistiu content_html no fim; polling curto garante que o FE veja
    // a transição pra EXTRACTING (ativando o SSE) e depois DRAFTED (parando).
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const draft = query.state.data as Draft | undefined;
      if (!draft || draft.status !== "DRAFT" || draft.supersededAt)
        return false;
      if (draft.sagaState === "EXTRACTING") return 1000;
      if (draft.sagaState !== "DRAFTED" || !draft.currentVersionId)
        return false;
      const reason = draft.qualityAuthorization?.reasonCode;
      if (
        reason !== "not_reviewed" &&
        reason !== "checking" &&
        reason !== "decision_pending" &&
        reason !== "blocked"
      )
        return false;
      // The BE quality decision has a 300s policy timeout. Anchor this
      // follow-up once per generated version to the server's first observed
      // update; status flips and unrelated refetches cannot renew it.
      if (followup.current?.version !== draft.currentVersionId) {
        const updated = Date.parse(draft.updatedAt);
        followup.current = {
          version: draft.currentVersionId,
          startedAt: Number.isFinite(updated)
            ? Math.min(updated, Date.now())
            : Date.now(),
        };
      }
      if (Date.now() - followup.current.startedAt < 300_000) return 1000;
      return false;
    },
  });
}
