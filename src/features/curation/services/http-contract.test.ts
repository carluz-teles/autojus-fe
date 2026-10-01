import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { admitImportedCase } from "./import-admission";
import { buildImportBody, commandImport, stageImport } from "./imports";
import { freezeSample, samplingFreezeBody } from "./sampling";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("curation services through the real HTTP serializer", () => {
  it("sends object commands and preserves exact import JSON bytes", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:18080");
    vi.resetModules();
    const fetch = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ data: { id: "synthetic" } }),
      );
    vi.stubGlobal("fetch", fetch);
    const { apiFetch } = await import("@/lib/api/client");
    const api: ApiFetcher = apiFetch;
    const raw = buildImportBody(
      "request",
      "synthetic",
      '[{"text":"first","text":"second"}]',
    );
    await stageImport(api, raw);
    expect(fetch.mock.calls[0][1].body).toBe(raw);
    const command = {
      request_id: "request",
      expected_revision: 1,
      action: "cancel" as const,
      selection: [],
      reason: "synthetic",
    };
    await commandImport(api, "batch", command);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(command);
    const body = samplingFreezeBody(
      "request",
      {
        lineage_key: "synthetic",
        seed: "synthetic",
        origin: "synthetic",
        matter_key: "",
        sample_size: 1,
        population_digest: "a".repeat(64),
        screening: { source: { stratum: "residual", reason: "synthetic" } },
      },
      {
        digest: "a".repeat(64),
        sources: [
          {
            source_link_id: "source",
            case_version_id: "case",
            origin: "synthetic",
            matter_key: "civel",
            legal_date: "2026-09-01",
            knowledge_as_of: "2026-09-29T00:00:00Z",
            purposes: ["evaluation"],
            reserved_split: null,
          },
        ],
      },
    );
    await freezeSample(api, body);
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(body);
    const admission: Parameters<typeof admitImportedCase>[1] = {
      request_id: "request",
      import_item_id: "item",
      expected_batch_revision: 2,
      intimation_id: null,
      matter_key: "civel",
      legal_date: "2026-09-01",
      knowledge_as_of: "2026-09-29T00:00:00Z",
      reviewed_at: "2026-09-29T00:00:00Z",
      dataset_key: "synthetic:pilot",
      privacy_policy_revision: 0,
      consent_receipt: "",
      consent_confirmed_at: "",
      sanitization: {
        version: "intimation-redaction-v1",
        source_digest: "a".repeat(64),
        meaning_status: "preserved",
        privacy_reviewed: true,
        review_receipt: "synthetic:review",
        purposes: ["evaluation"],
        redactions: [],
      },
    };
    await admitImportedCase(api, admission);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual(admission);
    expect(fetch.mock.calls[0][1].headers["Content-Type"]).toBe(
      "application/json",
    );
    await expect(
      apiFetch("/v1/curation/imports", {
        method: "POST",
        body: { foo: 1 },
        serializedJson: raw,
      }),
    ).rejects.toThrow("somente um corpo");
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
