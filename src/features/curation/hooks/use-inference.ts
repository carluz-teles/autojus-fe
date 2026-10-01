"use client";

import type { PreparedTask } from "../services/annotation-preparation";
import { useInferenceState } from "./_private/use-inference";
import { useBackofficeContext } from "./use-backoffice-context";

export function useInference(
  task: PreparedTask,
  protocolDigest: string,
  valid: boolean,
) {
  const { capabilities } = useBackofficeContext();
  const allowed = capabilities.includes("curation.predict");
  return useInferenceState(
    task,
    protocolDigest,
    allowed,
    valid,
    capabilities.includes("curation.publish"),
  );
}
