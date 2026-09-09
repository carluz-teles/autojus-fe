"use client";

import { useEffect } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  currentAIOperation,
  type ExperiencePhase,
  recordAIExperience,
} from "./ai-experience";

// Call from the view that actually commits the result. Two frames place the
// observation after React's DOM commit and a paint opportunity; background tabs
// are excluded rather than producing misleadingly fast perceived times.
export function useAIExperience(
  path: string,
  ready: boolean,
  phase: ExperiencePhase = "complete",
  revision?: unknown,
) {
  const api = useApi();
  useEffect(() => {
    if (!ready) return;
    const operationId = currentAIOperation(path);
    if (!operationId) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        recordAIExperience(
          path,
          phase,
          (body) =>
            api("/v1/ai/experience-events", {
              method: "POST",
              body,
              signal: AbortSignal.timeout(2000),
            }),
          operationId,
        ),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [api, path, ready, phase, revision]);
}
