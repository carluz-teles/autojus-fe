"use client";
import type { DatasetRelease } from "../services/dataset-releases";
import { useRAGIndexState } from "./_private/use-rag-index";
import { useBackofficeContext } from "./use-backoffice-context";

export function useRAGIndex(release: DatasetRelease, loading: boolean) {
  const { capabilities } = useBackofficeContext();
  const allowed =
    capabilities.includes("curation.publish") &&
    capabilities.includes("curation.predict");
  return useRAGIndexState(release, allowed, loading);
}
