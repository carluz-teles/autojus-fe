"use client";
import {
  type FeedbackCurationScope,
  feedbackQueueView,
} from "../services/feedback-queues";
import { useFeedbackQueueForm } from "./_private/use-feedback-queue-form";
import {
  useFeedbackCurationScopeQuery,
  useFeedbackQueueList,
  useFeedbackQueueQuery,
} from "./_private/use-feedback-queue-queries";
import { useBackofficeContext } from "./use-backoffice-context";

export function useFeedbackCurationScopes(id?: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.admit");
  const query = useFeedbackCurationScopeQuery(allowed);
  const scopes =
    allowed && query.isSuccess && !query.isFetching ? query.data : [];
  function refresh() {
    if (allowed) void query.refetch();
  }
  return {
    allowed,
    query,
    scopes,
    scope: scopes.find((s) => s.id === id),
    refresh,
  };
}
export function useFeedbackQueuePreparation(scope: FeedbackCurationScope) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.admit");
  const form = useFeedbackQueueForm(scope, allowed);
  const list = useFeedbackQueueList(scope.id, allowed);
  return { ...form, list };
}
export function useFeedbackQueue(id: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.admit");
  const query = useFeedbackQueueQuery(id, allowed);
  const queue =
    allowed && query.isSuccess && !query.isFetching ? query.data : undefined;
  const presentation = queue
    ? feedbackQueueView(queue)
    : { channels: [], items: [] };
  function refresh() {
    if (allowed) void query.refetch();
  }
  return { allowed, query, queue, ...presentation, refresh };
}
