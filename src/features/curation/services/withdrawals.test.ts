import { expect, it } from "vitest";

import { scopedWithdrawalBody, type WithdrawalImpact } from "./withdrawals";
const impact: WithdrawalImpact = {
  scope: "source",
  target: "source",
  digest: "a".repeat(64),
  affected_sources: 2,
  gold_revisions: 3,
  releases: 1,
  publications: 1,
  already_withdrawn: false,
  group_withdrawn: false,
  policy_active: null,
  withdrawal: null,
};
it("requires confirmation of the exact impact and does not accept changed dependencies", () => {
  const form = {
    reason: "Retirada explícita",
    confirmed: true,
    preview_digest: impact.digest,
  };
  expect(scopedWithdrawalBody(form, impact, "request")).toEqual({
    scope: "source",
    target: "source",
    body: {
      request_id: "request",
      reason: form.reason,
      expected_impact_digest: impact.digest,
    },
  });
  expect(() =>
    scopedWithdrawalBody({ ...form, confirmed: false }, impact, "r"),
  ).toThrow();
  expect(() =>
    scopedWithdrawalBody(form, { ...impact, digest: "b".repeat(64) }, "r"),
  ).toThrow();
  expect(() =>
    scopedWithdrawalBody(form, { ...impact, already_withdrawn: true }, "r"),
  ).toThrow();
});
