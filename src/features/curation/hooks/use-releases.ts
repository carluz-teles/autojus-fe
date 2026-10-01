"use client";
import type {
  DatasetRelease,
  PublicationJob,
} from "../services/dataset-releases";
import { useReleaseCommands } from "./_private/use-release-commands";
import { useReleaseEditor } from "./_private/use-release-editor";
import {
  useReleaseDetailQueries,
  useReleaseLists,
} from "./_private/use-release-queries";
import { useBackofficeContext } from "./use-backoffice-context";
export function useReleaseWorkspace() {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return { allowed, ...useReleaseLists(allowed) };
}
export function useReleasePreparation(batch: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return { allowed, ...useReleaseEditor(batch, allowed) };
}
export function useReleaseDetail(id: string) {
  const { capabilities } = useBackofficeContext();
  const allowed = capabilities.includes("curation.publish");
  return {
    allowed,
    canEvaluate: allowed && capabilities.includes("curation.predict"),
    ...useReleaseDetailQueries(id, allowed),
  };
}
export function useReleaseActions(
  release: DatasetRelease,
  jobs: PublicationJob[],
  loading: boolean,
) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return useReleaseCommands(release, jobs, allowed, loading);
}
