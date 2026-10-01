"use client";
import type { GoldPreview, GoldRevision } from "../services/annotation-gold";
import { useGoldEditor, useGoldWithdrawal } from "./_private/use-gold-forms";
import {
  useGoldCandidates,
  useGoldPreviewQuery,
  useGoldRevisionQuery,
} from "./_private/use-gold-queries";
import { useBackofficeContext } from "./use-backoffice-context";
export function useGoldWorkspace() {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return { allowed, ...useGoldCandidates(allowed) };
}
export function useGoldPreview(id: string) {
  const { capabilities } = useBackofficeContext();
  const allowed = capabilities.includes("curation.publish");
  const query = useGoldPreviewQuery(id, allowed);
  function refresh() {
    if (allowed) void query.refetch();
  }
  return {
    allowed,
    canDecide: capabilities.includes("curation.decide"),
    query,
    refresh,
  };
}
export function useGoldForm(preview: GoldPreview, loading: boolean) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return useGoldEditor(preview, allowed, loading);
}
export function useGoldRevision(id: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  const query = useGoldRevisionQuery(id, allowed);
  function refresh() {
    if (allowed) void query.refetch();
  }
  return { allowed, query, refresh };
}
export function useWithdrawalForm(revision: GoldRevision) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return useGoldWithdrawal(
    revision.id,
    allowed,
    revision.blockers.includes("gold_withdrawn"),
  );
}
