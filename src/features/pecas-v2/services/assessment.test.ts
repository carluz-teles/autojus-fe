import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  buildAssessmentInput,
  getAssessment,
  requestAssessment,
  validateAssessment,
} from "./pecas-v2.service";

describe("serviço da conferência (assessment)", () => {
  it("buildAssessmentInput normaliza e aplica tone default 'tecnico'", () => {
    const input = buildAssessmentInput(["a", "b"], "  focar prescrição  ");
    expect(input).toEqual({
      thesisIds: ["a", "b"],
      instructions: "focar prescrição",
      tone: "tecnico",
    });
  });

  it("requestAssessment envia {input} e devolve o request", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: {
        request: { id: "r1", status: "queued", input_fingerprint: "fp" },
      },
    }) as unknown as ApiFetcher;
    const input = buildAssessmentInput(["t"], "x");
    const req = await requestAssessment(fetcher, "piece", input);
    expect(req.id).toBe("r1");
    expect(
      (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0],
    ).toEqual([
      "/v1/pecas/piece/assessment",
      {
        method: "POST",
        body: {
          input: { thesis_ids: ["t"], instructions: "x", tone: "tecnico" },
        },
      },
    ]);
  });

  it("getAssessment faz GET e desembrulha o estado", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: {
        scope_type: "draft",
        scope_id: "piece",
        request: { id: "r", status: "succeeded" },
        assessment: {
          id: "a",
          content_hash: "h",
          input_fingerprint: "f",
          validation: null,
        },
        needs_refresh: false,
        input: null,
      },
    }) as unknown as ApiFetcher;
    const state = await getAssessment(fetcher, "piece");
    expect(state.assessment?.id).toBe("a");
    expect(
      (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0],
    ).toBe("/v1/pecas/piece/assessment");
  });

  it("validateAssessment envia hash/fingerprint + input idêntico", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: { assessment: { id: "a" } },
    }) as unknown as ApiFetcher;
    const input = buildAssessmentInput(["t"], "x");
    await validateAssessment(fetcher, "piece", "a", "hash", "fp", input);
    expect(
      (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0],
    ).toEqual([
      "/v1/pecas/piece/assessment/a/validate",
      {
        method: "POST",
        body: {
          expected_content_hash: "hash",
          expected_input_fingerprint: "fp",
          input: { thesis_ids: ["t"], instructions: "x", tone: "tecnico" },
        },
      },
    ]);
  });
});
