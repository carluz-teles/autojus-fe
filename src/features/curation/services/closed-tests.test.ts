import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { closedTestFixture } from "../__tests__/closed-test-fixture";
import {
  closedDeliverySchema,
  closedPreviewSchema,
  closedRunSchema,
} from "./closed-test-schemas";
import {
  closedTestPoll,
  getClosedReservation,
  previewClosedTest,
  sendClosedCommand,
} from "./closed-tests";

describe("closed test contract", () => {
  it("accepts paired test evidence, preserving the synthetic origin", () => {
    const f = closedTestFixture();
    expect(closedPreviewSchema.parse(f.preview).origin).toBe("synthetic");
    expect(closedRunSchema.parse(f.run).pair_count).toBe(1);
    expect(closedDeliverySchema.parse(f.delivery).report.split).toBe("test");
  });
  it("rejects a missing role, swapped outcome, duplicate task and false completion", () => {
    const f = closedTestFixture();
    const missing = structuredClone(f.delivery);
    missing.report.stages.pop();
    expect(closedDeliverySchema.safeParse(missing).success).toBe(false);
    const swapped = structuredClone(f.delivery);
    swapped.report.stages[0].outcome = "failed";
    expect(closedDeliverySchema.safeParse(swapped).success).toBe(false);
    const duplicate = structuredClone(f.delivery);
    duplicate.report.cases.push(duplicate.report.cases[0]);
    expect(closedDeliverySchema.safeParse(duplicate).success).toBe(false);
    const incomplete = structuredClone(f.delivery);
    incomplete.report.run_state = "uncertain";
    expect(closedDeliverySchema.safeParse(incomplete).success).toBe(false);
  });
  it("rejects oversized budgets and work counts that hide half of the pair", () => {
    const f = closedTestFixture();
    expect(
      closedPreviewSchema.safeParse({ ...f.preview, planned_http_calls: 3 })
        .success,
    ).toBe(false);
    expect(
      closedRunSchema.safeParse({ ...f.run, work_counts: { completed: 1 } })
        .success,
    ).toBe(false);
  });
  it("reads absence without issuing commands and refuses mismatched previews", async () => {
    const f = closedTestFixture();
    const api = vi.fn().mockResolvedValue({ data: null });
    expect(
      await getClosedReservation(api as ApiFetcher, f.candidateID),
    ).toBeNull();
    expect(api.mock.calls[0][1]).not.toHaveProperty("method", "POST");
    api.mockResolvedValue({ data: { ...f.preview, candidate_id: f.ids.run } });
    await expect(
      previewClosedTest(api as ApiFetcher, f.candidateID, f.preview.selection),
    ).rejects.toThrow();
  });
  it("sends explicit bodies and rejects report or reservation cross-links", async () => {
    const f = closedTestFixture();
    const api = vi.fn().mockResolvedValue({ data: f.reservation });
    const command = {
      kind: "reserve" as const,
      candidate: f.candidateID,
      body: {
        request_id: f.ids.request,
        selection: f.preview.selection,
        expected_preview_digest: f.preview.digest,
        confirmed: true as const,
      },
    };
    expect((await sendClosedCommand(api as ApiFetcher, command)).kind).toBe(
      "reserve",
    );
    expect(api.mock.calls[0][1].body).toEqual(command.body);
    api.mockResolvedValue({
      data: { ...f.reservation, request_id: f.ids.run },
    });
    await expect(
      sendClosedCommand(api as ApiFetcher, command),
    ).rejects.toThrow();
    api.mockResolvedValue({ data: f.delivery });
    await expect(
      sendClosedCommand(api as ApiFetcher, {
        kind: "report",
        run: f.ids.run,
        reservation: f.ids.report,
        body: {
          request_id: f.ids.request,
          expected_definition_digest: f.preview.digest,
          confirmed_exposure: true,
        },
      }),
    ).rejects.toThrow();
  });
  it("polls active eligible work only and never after read errors", () => {
    const f = closedTestFixture();
    expect(
      closedTestPoll(
        { ...f.run, state: "running", finished_at: null },
        "success",
      ),
    ).toBe(2000);
    expect(
      closedTestPoll(
        { ...f.run, state: "running", eligible: false },
        "success",
      ),
    ).toBe(false);
    expect(closedTestPoll({ ...f.run, state: "running" }, "error")).toBe(false);
    expect(closedTestPoll(f.run, "success")).toBe(false);
  });
});
