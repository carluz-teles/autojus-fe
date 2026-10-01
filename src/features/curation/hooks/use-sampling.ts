"use client";

import type { SamplingPopulation } from "../services/sampling";
import { useSamplingFormState } from "./_private/use-sampling-form";
import {
  useSamplingDetail,
  useSamplingPopulationQuery,
  useSamplingQueries,
  useSamplingSourceView,
} from "./_private/use-sampling-queries";
import { useSamplingRelation } from "./_private/use-sampling-relation";
import { useBackofficeContext } from "./use-backoffice-context";

export function useSamplingWorkspace() {
  const session = useBackofficeContext(),
    allowed = session.capabilities.includes("curation.manage");
  return { allowed, ...useSamplingQueries(allowed) };
}
export function useSamplingForm(population: SamplingPopulation) {
  return useSamplingFormState(population);
}
export function useSamplingFrame(id: string) {
  const session = useBackofficeContext(),
    allowed = session.capabilities.includes("curation.manage");
  return {
    allowed,
    ...useSamplingDetail(id, allowed),
    relation: useSamplingRelation(),
    population: useSamplingPopulationQuery(allowed),
  };
}
export function useSamplingSource(id: string) {
  const session = useBackofficeContext();
  return useSamplingSourceView(
    id,
    session.capabilities.includes("curation.manage"),
  );
}
