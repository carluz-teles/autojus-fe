import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { buildAssessmentInput } from "../services/pecas-v2.service";
import {
  AssessmentLifecycleError,
  runAssessmentAndGenerate,
} from "./assessment-lifecycle";

const input = buildAssessmentInput(["t1", "t2"], "Focar prescrição.");
const noSleep = () => Promise.resolve();

describe("runAssessmentAndGenerate — sequência conferência → generate", () => {
  it("faz request → poll (succeeded) → validate → generate com o MESMO input", async () => {
    const calls: { path: string; method: string; body?: unknown }[] = [];
    const record = (path: string, init?: { method?: string; body?: unknown }) =>
      calls.push({ path, method: init?.method ?? "GET", body: init?.body });

    const fetcher = vi.fn(
      (path: string, init?: { method?: string; body?: unknown }) => {
        record(path, init);
        const method = init?.method ?? "GET";
        if (method === "POST" && path.endsWith("/assessment")) {
          return Promise.resolve({
            data: {
              request: {
                id: "req1",
                status: "queued",
                input_fingerprint: "fp",
              },
            },
          });
        }
        if (method === "GET" && path.endsWith("/assessment")) {
          return Promise.resolve({
            data: {
              request: { id: "req1", status: "succeeded" },
              assessment: {
                id: "a1",
                content_hash: "hash1",
                input_fingerprint: "fp1",
                validation: null,
              },
              needs_refresh: false,
            },
          });
        }
        if (method === "POST" && path.includes("/validate")) {
          return Promise.resolve({ data: { assessment: { id: "a1" } } });
        }
        if (method === "POST" && path.endsWith("/generate")) {
          return Promise.resolve({
            data: { updated_at: "2026-09-16T00:00:00Z" },
          });
        }
        throw new Error(`unexpected: ${method} ${path}`);
      },
    ) as unknown as ApiFetcher;

    const r2 = await runAssessmentAndGenerate(fetcher, "d1", input, {
      expectedCurrentVersionId: null,
      sleep: noSleep,
    });
    expect(r2.updated_at).toBe("2026-09-16T00:00:00Z");

    // Order: POST assessment → GET assessment → POST validate → POST generate
    const seq = calls.map(
      (c) => `${c.method} ${c.path.split("/").slice(-1)[0]}`,
    );
    expect(seq[0]).toBe("POST assessment");
    expect(seq.some((s) => s === "GET assessment")).toBe(true);
    expect(seq.some((s) => s === "POST validate")).toBe(true);
    expect(seq[seq.length - 1]).toBe("POST generate");

    // Same canonical input in request, validate and generate.
    const reqCall = calls.find(
      (c) => c.method === "POST" && c.path.endsWith("/assessment"),
    );
    const validateCall = calls.find((c) => c.path.includes("/validate"));
    const genCall = calls.find((c) => c.path.endsWith("/generate"));
    expect((reqCall!.body as { input: unknown }).input).toEqual({
      thesis_ids: ["t1", "t2"],
      instructions: "Focar prescrição.",
      tone: "tecnico",
    });
    expect((validateCall!.body as { input: unknown }).input).toEqual(
      (reqCall!.body as { input: unknown }).input,
    );
    expect(
      genCall!.body as { thesis_ids: string[]; instructions: string },
    ).toMatchObject({
      thesis_ids: ["t1", "t2"],
      instructions: "Focar prescrição.",
      assessment_version_id: "a1",
      assessment_content_hash: "hash1",
      input_fingerprint: "fp1",
      expected_current_version_id: null,
    });
  });

  it("faz poll até succeeded (queued → running → succeeded)", async () => {
    let polls = 0;
    const fetcher = vi.fn((path: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "POST" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: { request: { id: "r", status: "queued" } },
        });
      if (method === "GET" && path.endsWith("/assessment")) {
        polls++;
        const status =
          polls < 3 ? (polls === 1 ? "queued" : "running") : "succeeded";
        return Promise.resolve({
          data: {
            request: { id: "r", status },
            assessment:
              status === "succeeded"
                ? {
                    id: "a",
                    content_hash: "h",
                    input_fingerprint: "f",
                    validation: null,
                  }
                : null,
            needs_refresh: status !== "succeeded",
          },
        });
      }
      if (path.includes("/validate")) return Promise.resolve({ data: {} });
      if (path.endsWith("/generate"))
        return Promise.resolve({ data: { updated_at: "x" } });
      throw new Error("unexpected");
    }) as unknown as ApiFetcher;

    const r = await runAssessmentAndGenerate(fetcher, "d", input, {
      expectedCurrentVersionId: null,
      sleep: noSleep,
    });
    expect(r.updated_at).toBe("x");
    expect(polls).toBe(3);
  });

  it("lança erro (step=poll) quando o request falha — NUNCA chama generate", async () => {
    let generateCalled = false;
    const fetcher = vi.fn((path: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "POST" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: { request: { id: "r", status: "queued" } },
        });
      if (method === "GET" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: {
            request: {
              id: "r",
              status: "failed",
              error: { code: "source_unavailable", message: "Sem fontes." },
            },
            assessment: null,
            needs_refresh: true,
          },
        });
      if (path.endsWith("/generate")) {
        generateCalled = true;
        return Promise.resolve({ data: { updated_at: "x" } });
      }
      throw new Error("unexpected");
    }) as unknown as ApiFetcher;

    await expect(
      runAssessmentAndGenerate(fetcher, "d", input, {
        expectedCurrentVersionId: null,
        sleep: noSleep,
      }),
    ).rejects.toBeInstanceOf(AssessmentLifecycleError);
    expect(generateCalled).toBe(false);
  });

  it("chama onAssessmentStarted (sinal da fase 2) antes do request", async () => {
    const started = vi.fn();
    const fetcher = vi.fn((path: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "POST" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: { request: { id: "r", status: "succeeded" } },
        });
      if (method === "GET" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: {
            request: { id: "r", status: "succeeded" },
            assessment: {
              id: "a",
              content_hash: "h",
              input_fingerprint: "f",
              validation: null,
            },
            needs_refresh: false,
          },
        });
      if (path.includes("/validate")) return Promise.resolve({ data: {} });
      if (path.endsWith("/generate"))
        return Promise.resolve({ data: { updated_at: "x" } });
      throw new Error("unexpected");
    }) as unknown as ApiFetcher;

    await runAssessmentAndGenerate(fetcher, "d", input, {
      expectedCurrentVersionId: null,
      sleep: noSleep,
      onAssessmentStarted: started,
    });
    expect(started).toHaveBeenCalledOnce();
  });

  it("dá timeout no poll sem chamar generate", async () => {
    let generateCalled = false;
    let t = 0;
    const fetcher = vi.fn((path: string, init?: { method?: string }) => {
      const method = init?.method ?? "GET";
      if (method === "POST" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: { request: { id: "r", status: "queued" } },
        });
      if (method === "GET" && path.endsWith("/assessment"))
        return Promise.resolve({
          data: {
            request: { id: "r", status: "running" },
            assessment: null,
            needs_refresh: true,
          },
        });
      if (path.endsWith("/generate")) {
        generateCalled = true;
        return Promise.resolve({ data: { updated_at: "x" } });
      }
      throw new Error("unexpected");
    }) as unknown as ApiFetcher;

    await expect(
      runAssessmentAndGenerate(fetcher, "d", input, {
        expectedCurrentVersionId: null,
        sleep: noSleep,
        pollTimeoutMs: 3000,
        now: () => {
          t += 2000;
          return t;
        },
      }),
    ).rejects.toMatchObject({ step: "poll", code: "timeout" });
    expect(generateCalled).toBe(false);
  });
});
