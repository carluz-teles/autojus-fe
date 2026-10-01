import { expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import { evaluationFixture } from "../__tests__/evaluation-fixture";
import {
  evaluationPoll,
  freezeEvaluationPlan,
  getEvaluationReportMetadata,
  getEvaluationRun,
  issueEvaluationReport,
  previewEvaluationPlan,
  requestEvaluationRun,
} from "./evaluations";

it("binds preview and freeze to the whole selection and exact confirmation", async () => {
  const f = evaluationFixture();
  const api = vi
    .fn()
    .mockResolvedValue({ data: f.preview }) as unknown as ApiFetcher;
  expect(await previewEvaluationPlan(api, f.preview.selection)).toEqual(
    f.preview,
  );
  const wrong = {
    ...f.preview,
    selection: { ...f.preview.selection, split: "train" },
  };
  vi.mocked(api).mockResolvedValue({ data: wrong });
  await expect(
    previewEvaluationPlan(api, f.preview.selection),
  ).rejects.toThrow();
  vi.mocked(api).mockResolvedValue({ data: f.plan });
  expect(await freezeEvaluationPlan(api, f.freeze)).toEqual(f.plan);
  vi.mocked(api).mockResolvedValue({
    data: { ...f.plan, request_id: f.ids.run },
  });
  await expect(freezeEvaluationPlan(api, f.freeze)).rejects.toThrow();
});

it("treats only a not-found read as absence and preserves authorization and network failures", async () => {
  const f = evaluationFixture();
  const api = vi
    .fn()
    .mockRejectedValue(
      new ApiError("ENTITY_NOT_FOUND", "Ausente", 404),
    ) as unknown as ApiFetcher;
  expect(await getEvaluationRun(api, f.ids.plan)).toBeNull();
  expect(await getEvaluationReportMetadata(api, f.ids.run)).toBeNull();
  for (const error of [
    new ApiError("FORBIDDEN", "Negado", 403),
    new ApiError("NETWORK", "Offline", 0),
  ]) {
    vi.mocked(api).mockRejectedValue(error);
    await expect(getEvaluationRun(api, f.ids.plan)).rejects.toBe(error);
    await expect(getEvaluationReportMetadata(api, f.ids.run)).rejects.toBe(
      error,
    );
  }
});

it("validates execution and report receipts and never replaces unknown cost with zero", async () => {
  const f = evaluationFixture();
  const api = vi
    .fn()
    .mockResolvedValue({ data: f.run }) as unknown as ApiFetcher;
  expect(await requestEvaluationRun(api, f.runCommand)).toEqual(f.run);
  vi.mocked(api).mockResolvedValue({
    data: { ...f.run, definition_digest: "f".repeat(64) },
  });
  await expect(requestEvaluationRun(api, f.runCommand)).rejects.toThrow();
  vi.mocked(api).mockResolvedValue({ data: f.delivery });
  const received = await issueEvaluationReport(api, f.reportCommand);
  expect(received.report.schema_version).toBe("intimation-run-report-v1");
  if (received.report.schema_version !== "intimation-run-report-v1")
    throw new Error("Unexpected report variant");
  expect(
    received.report.evaluation.metrics.telemetry.total_cost_usd,
  ).toBeNull();
  vi.mocked(api).mockResolvedValue({
    data: {
      ...f.delivery,
      report: { ...f.delivery.report, run_id: f.ids.plan },
    },
  });
  await expect(issueEvaluationReport(api, f.reportCommand)).rejects.toThrow();
  vi.mocked(api).mockResolvedValue({
    data: {
      ...f.delivery,
      report: {
        ...f.delivery.report,
        evaluation: {
          ...f.delivery.report.evaluation,
          production_approved: true,
        },
      },
    },
  });
  await expect(issueEvaluationReport(api, f.reportCommand)).rejects.toThrow();
});

it("polls only active runs and stops on terminal states and errors", () => {
  const f = evaluationFixture();
  expect(evaluationPoll({ ...f.run, state: "queued" }, "success")).toBe(2000);
  expect(evaluationPoll({ ...f.run, state: "running" }, "success")).toBe(2000);
  for (const state of ["completed", "blocked", "uncertain"] as const)
    expect(evaluationPoll({ ...f.run, state }, "success")).toBe(false);
  expect(evaluationPoll({ ...f.run, state: "running" }, "error")).toBe(false);
  expect(evaluationPoll(null, "success")).toBe(false);
});
