import { describe, expect, it } from "vitest";

import { isProposalStale } from "./proposal-revision";

describe("isProposalStale", () => {
  it("keeps a proposal actionable only on its source revision", () => {
    expect(isProposalStale({ baseRevision: "rev-1" }, "rev-1")).toBe(false);
    expect(isProposalStale({ baseRevision: "rev-1" }, "rev-2")).toBe(true);
  });

  it("fails closed for legacy proposals and an uninitialized editor", () => {
    expect(isProposalStale({ baseRevision: "" }, "rev-1")).toBe(true);
    expect(isProposalStale({ baseRevision: "rev-1" }, "")).toBe(true);
  });
});
