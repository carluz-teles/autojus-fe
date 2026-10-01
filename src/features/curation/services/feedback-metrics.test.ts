import { expect, it, vi } from "vitest";

import { metricsFixture } from "../__tests__/feedback-metrics-fixture";
import {
  getFeedbackMetrics,
  metricRows,
  metricsPeriodSchema,
} from "./feedback-metrics";

it("uses the approved scope and rejects replies from a different scope or interval", async () => {
  const api = vi.fn().mockResolvedValue({ data: metricsFixture });
  const period = { from: "2026-10-01", to: "2026-10-01" };
  const result = await getFeedbackMetrics(api, metricsFixture.scope.id, period);
  expect(api).toHaveBeenCalledWith(
    `/v1/curation/feedback-scopes/${metricsFixture.scope.id}/metrics?from=2026-10-01&to=2026-10-01`,
    expect.anything(),
  );
  expect(result.scope.id).toBe(metricsFixture.scope.id);
  api.mockResolvedValue({
    data: { ...metricsFixture, period_end: "2026-10-02" },
  });
  await expect(
    getFeedbackMetrics(api, metricsFixture.scope.id, period),
  ).rejects.toThrow();
});

it("keeps exposure denominators distinct from votes and hides suppressed cells", () => {
  const row = metricRows(metricsFixture.rows)[0];
  expect(row.participation).toBe("1 de 2 (50%)");
  expect(row.concentration).toBe("2 de 3 (67%)");
  const suppressed = metricRows([
    { ...metricsFixture.rows[0], counts: null },
  ])[0];
  expect(suppressed.metrics).toEqual([]);
  expect(suppressed.participation).toBeNull();
});

it("validates real dates and limits a query to 31 inclusive UTC days", () => {
  expect(
    metricsPeriodSchema.safeParse({ from: "2026-01-01", to: "2026-01-31" })
      .success,
  ).toBe(true);
  for (const period of [
    { from: "2026-01-01", to: "2026-02-01" },
    { from: "2026-10-02", to: "2026-10-01" },
    { from: "2026-02-30", to: "2026-03-01" },
  ]) {
    expect(metricsPeriodSchema.safeParse(period).success).toBe(false);
  }
});
