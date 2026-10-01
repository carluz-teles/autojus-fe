import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { candidateFixture } from "../__tests__/candidate-fixture";
import { emptyCandidateForm, parseCandidateForm } from "./candidate-form";
import {
  candidatePolicySchema,
  candidateViewSchema,
} from "./candidate-schemas";
import { candidateCommand, freezeCandidate } from "./candidates";

describe("candidate contracts", () => {
  it("preserves explicit criteria, immutable identity and synthetic origin", () => {
    const f = candidateFixture();
    expect(candidateViewSchema.parse(f.candidate).document.origin).toBe(
      "synthetic",
    );
    expect(candidatePolicySchema.parse(f.policy).strata.rare).toBeNull();
  });
  it.each([
    "min_cases",
    "min_groups",
    "min_acceptable_bps",
    "max_critical_bps",
    "max_unavailable_bps",
    "max_regression_bps",
  ])("rejects missing criterion %s", (field) => {
    const policy = structuredClone(candidateFixture().policy);
    delete (policy.overall as Record<string, unknown>)[field];
    expect(candidatePolicySchema.safeParse(policy).success).toBe(false);
  });
  it("rejects missing strata, invalid groups and silent activation", () => {
    const f = candidateFixture();
    expect(
      candidatePolicySchema.safeParse({ ...f.policy, strata: { rare: null } })
        .success,
    ).toBe(false);
    expect(
      candidatePolicySchema.safeParse({
        ...f.policy,
        overall: { ...f.policy.overall, min_groups: 2 },
      }).success,
    ).toBe(false);
    expect(
      candidateViewSchema.safeParse({
        ...f.candidate,
        closed_test_available: true,
      }).success,
    ).toBe(true);
    expect(
      candidateViewSchema.safeParse({
        ...f.candidate,
        production_approved: true,
      }).success,
    ).toBe(false);
    expect(
      candidateViewSchema.safeParse({ ...f.candidate, eligible: false })
        .success,
    ).toBe(false);
  });
  it("binds the freeze receipt to sources, policy, reason, request and route", async () => {
    const f = candidateFixture(),
      command = candidateCommand(f.delivery, f.form, f.ids.request);
    if (!command) throw new Error("fixture command missing");
    const api = vi
      .fn()
      .mockResolvedValue({ data: f.candidate }) as unknown as ApiFetcher;
    await expect(freezeCandidate(api, command)).resolves.toEqual(f.candidate);
    for (const document of [
      { ...f.candidate.document, comparison_id: f.ids.release },
      { ...f.candidate.document, candidate_report_digest: "f".repeat(64) },
      { ...f.candidate.document, reason: "different" },
      { ...f.candidate.document, origin: "real" },
      { ...f.candidate.document, plan_id: f.ids.release },
      { ...f.candidate.document, route_digest: "f".repeat(64) },
      {
        ...f.candidate.document,
        route: { ...f.candidate.document.route, mode: "abstention-v1" },
      },
      {
        ...f.candidate.document,
        policy: { ...f.policy, overall: { ...f.policy.overall, min_cases: 2 } },
      },
    ]) {
      vi.mocked(api).mockResolvedValue({ data: { ...f.candidate, document } });
      await expect(freezeCandidate(api, command)).rejects.toThrow();
    }
  });
});

describe("candidate criteria form", () => {
  it("matches the server's UTF-8 reason size bound", () => {
    const f = candidateFixture();
    f.form.reason = "é".repeat(2001);
    expect(parseCandidateForm(f.form, f.delivery).body).toBeNull();
    f.form.reason = "é".repeat(2000);
    expect(parseCandidateForm(f.form, f.delivery).body).not.toBeNull();
  });
  it("starts without implicit limits, sources or stratum decisions", () => {
    const f = candidateFixture(),
      form = emptyCandidateForm();
    expect(form.overall.min_acceptable_bps).toBe("");
    expect(form.strata.rare.choice).toBe("");
    expect(parseCandidateForm(form, f.delivery).body).toBeNull();
  });
  it("converts percentages to basis points exactly and refuses blank, exponent and excessive precision", () => {
    const f = candidateFixture();
    f.form.overall.min_acceptable_bps = "33,33";
    expect(
      parseCandidateForm(f.form, f.delivery).body?.policy.overall
        .min_acceptable_bps,
    ).toBe(3333);
    for (const value of ["", "1e2", "100.01", "-1", "0.001", "NaN"]) {
      f.form.overall.min_acceptable_bps = value;
      expect(parseCandidateForm(f.form, f.delivery).body).toBeNull();
    }
  });
  it("requires separate stratum criteria, distinct sources and validation", () => {
    const f = candidateFixture();
    f.form.strata.rare.choice = "require";
    expect(parseCandidateForm(f.form, f.delivery).body).toBeNull();
    f.form.strata.rare.rule = { ...f.form.overall };
    expect(
      parseCandidateForm(f.form, f.delivery).body?.policy.strata.rare,
    ).not.toBeNull();
    f.form.baseline = f.form.candidate;
    expect(parseCandidateForm(f.form, f.delivery).body).toBeNull();
    f.form.baseline = f.sources[0].report_id;
    f.delivery.document.comparison.split = "train";
    expect(parseCandidateForm(f.form, f.delivery).body).toBeNull();
  });
});
