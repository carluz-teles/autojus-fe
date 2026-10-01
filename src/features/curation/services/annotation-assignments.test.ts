import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { annotationFixture } from "../__tests__/annotation-fixture";
import {
  claimAnnotation,
  getAnnotationInput,
  sendAnnotationCommand,
} from "./annotation-assignments";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("assignment transport", () => {
  it("requires the exact pinned suggestion for assisted review", async () => {
    const input = annotationFixture("assisted");
    const api = vi
      .fn()
      .mockResolvedValue({ data: input }) as unknown as ApiFetcher;
    await expect(getAnnotationInput(api, input.assignment.id)).resolves.toEqual(
      input,
    );
    input.assignment.prediction_id = "different-suggestion";
    await expect(getAnnotationInput(api, input.assignment.id)).rejects.toThrow(
      "atribuição autorizada",
    );
    delete input.prediction;
    await expect(getAnnotationInput(api, input.assignment.id)).rejects.toThrow(
      "atribuição autorizada",
    );
  });
  it("rejects an unexpected suggestion in a blind response before caching it", async () => {
    const input = annotationFixture("blind");
    input.prediction = annotationFixture("assisted").prediction;
    const api = vi
      .fn()
      .mockResolvedValue({ data: input }) as unknown as ApiFetcher;
    await expect(getAnnotationInput(api, input.assignment.id)).rejects.toThrow(
      "atribuição autorizada",
    );
    delete input.prediction;
    await expect(
      getAnnotationInput(api, "different-assignment"),
    ).rejects.toThrow("atribuição autorizada");
    await expect(getAnnotationInput(api, input.assignment.id)).resolves.toEqual(
      input,
    );
  });
  it("sends claim/save/submit as objects through the actual interceptor", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:18080");
    vi.resetModules();
    const fetch = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ data: { idempotent_replay: false } }),
      );
    vi.stubGlobal("fetch", fetch);
    const { apiFetch } = await import("@/lib/api/client");
    const claim = { request_id: "synthetic-request", slot: 1 };
    await claimAnnotation(apiFetch, "task/with space", claim);
    const body = {
      request_id: "synthetic-save",
      expected_revision: 2,
      expected_draft_revision: 1,
      annotation: { label: { answerability: "partial" } },
    };
    await sendAnnotationCommand(apiFetch, "assignment", {
      action: "draft",
      body,
    });
    await sendAnnotationCommand(apiFetch, "assignment", {
      action: "submissions",
      body,
    });
    expect(fetch.mock.calls[0][0]).toContain("task%2Fwith%20space/assignments");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(claim);
    expect(fetch.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(body);
    expect(fetch.mock.calls[2][1].method).toBe("POST");
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(body);
  });
});
