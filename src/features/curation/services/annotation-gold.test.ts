import { expect, it, vi } from "vitest";

import { preview } from "../__tests__/gold-fixture";
import { goldBody, goldPreviewReference, promoteGold } from "./annotation-gold";

const form = () => ({
  purposes: ["evaluation"],
  legal_valid_from: "2026-09-01",
  legal_valid_until: "",
  reason: "Motivo humano",
  confirmed: true,
  preview_reference: goldPreviewReference(preview),
});
it("pins revision and purposes, with explicit legal validity and confirmation", () => {
  expect(goldBody(form(), preview, "request")).toEqual({
    request_id: "request",
    decision_id: "decision",
    previous_revision_id: null,
    expected_revision: 0,
    purposes: ["evaluation"],
    legal_valid_from: "2026-09-01",
    legal_valid_until: null,
    reason: "Motivo humano",
  });
  for (const values of [
    { confirmed: false },
    { purposes: ["training"] },
    { purposes: ["evaluation", "evaluation"] },
    { legal_valid_from: "2026-10-01" },
    { legal_valid_until: "2026-09-29" },
    { legal_valid_from: "2026-02-30" },
    { reason: " " },
  ])
    expect(() =>
      goldBody({ ...form(), ...values }, preview, "request"),
    ).toThrow();
});
it("requires reconfirmation of changed eligibility, predecessor and permitted uses", () => {
  for (const next of [
    { eligible: false, blockers: ["source_withdrawn"] },
    { revision: 1, previous_revision_id: "gold" },
    { purposes: ["evaluation", "training"] },
  ])
    expect(() =>
      goldBody(form(), { ...preview, ...next }, "request"),
    ).toThrow();
});
it("does not accept a receipt for a different decision", async () => {
  const api = vi
    .fn()
    .mockResolvedValue({ data: { id: "gold", decision_id: "other" } });
  await expect(
    promoteGold(api, goldBody(form(), preview, "request")),
  ).rejects.toThrow();
  expect(api).toHaveBeenCalledWith("/v1/curation/gold-revisions", {
    method: "POST",
    body: goldBody(form(), preview, "request"),
  });
});
