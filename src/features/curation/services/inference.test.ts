import { expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { annotationFixture } from "../__tests__/annotation-fixture";
import fixtures from "../__tests__/intimation-label-v1.json";
import { getAnnotationInput } from "./annotation-assignments";
import { intimationAnnotationSchema } from "./annotation-schema";

it("rejects an inference hypothesis from a different frozen snapshot", async () => {
  const input = annotationFixture("assisted");
  input.prediction!.engine_version = "intimation-inference-v1";
  input.prediction!.suggestion.annotation = intimationAnnotationSchema.parse(
    fixtures.cases[0].annotation,
  );
  input.prediction!.suggestion.annotation.snapshot_digest = "f".repeat(64);
  const api = vi.fn(async () => ({ data: input })) as unknown as ApiFetcher;
  await expect(getAnnotationInput(api, input.assignment.id)).rejects.toThrow();
});
it("requires the structured output when the pinned engine is inference", async () => {
  const input = annotationFixture("assisted");
  input.prediction!.engine_version = "intimation-inference-v1";
  const api = vi.fn(async () => ({ data: input })) as unknown as ApiFetcher;
  await expect(getAnnotationInput(api, input.assignment.id)).rejects.toThrow();
});
