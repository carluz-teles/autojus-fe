import { expect, it, vi } from "vitest";

import { comparisonFixture } from "../__tests__/comparison-fixture";
import { comparisonDeliverySchema } from "./comparison-schemas";
import { createComparison, issueComparison } from "./comparisons";

it("accepts all three pairs and keeps empty strata", () => {
  const f = comparisonFixture();
  expect(
    comparisonDeliverySchema.parse(f.delivery).document.comparison.pairs,
  ).toHaveLength(3);
});

it.each([
  "sources",
  "pairs",
  "denominator",
  "target",
  "scores",
  "scope",
  "test",
  "production",
  "probability",
])("rejects an inconsistent %s contract", (kind) => {
  const f = comparisonFixture();
  const d = structuredClone(f.delivery),
    c = d.document.comparison;
  if (kind === "sources") d.document.source_reports.reverse();
  if (kind === "pairs") c.pairs[1] = c.pairs[0];
  if (kind === "denominator") c.pairs[0].metrics.cases++;
  if (kind === "target")
    c.cases[0].scores[1].target = { act_type: "contestacao" };
  if (kind === "scores") c.cases[0].scores.pop();
  if (kind === "scope") Object.assign(c, { scope: "all_legal_dimensions" });
  if (kind === "test") Object.assign(c, { split: "test" });
  if (kind === "production") Object.assign(c, { production_approved: true });
  if (kind === "probability") c.cases[0].inclusion_numerator = 3;
  expect(comparisonDeliverySchema.safeParse(d).success).toBe(false);
});

it("binds creation to exact ordered sources and request before accepting the response", async () => {
  const f = comparisonFixture();
  const command = {
    release: f.ids.release,
    body: {
      request_id: f.ids.request,
      sources: f.refs,
      confirmed_exposure: true as const,
    },
  };
  const api = vi.fn().mockResolvedValue({ data: f.delivery });
  expect(await createComparison(api, command)).toEqual(f.delivery);
  const altered = structuredClone(f.delivery);
  altered.document.source_reports[0].expected_digest = "f".repeat(64);
  api.mockResolvedValue({ data: altered });
  await expect(createComparison(api, command)).rejects.toThrow();
  expect(api.mock.calls[0][1]).toEqual({ method: "POST", body: command.body });
});

it("binds reissuance to exact comparison and digest", async () => {
  const f = comparisonFixture();
  const command = {
    id: f.comparisonID,
    body: {
      request_id: f.ids.request,
      expected_digest: f.delivery.digest,
      confirmed_exposure: true as const,
    },
  };
  const api = vi.fn().mockResolvedValue({ data: f.delivery });
  expect(await issueComparison(api, command)).toEqual(f.delivery);
  api.mockResolvedValue({ data: { ...f.delivery, digest: "f".repeat(64) } });
  await expect(issueComparison(api, command)).rejects.toThrow();
});
