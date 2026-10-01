import type { CandidateForm } from "../services/candidate-form";
import type { CandidateView } from "../services/candidate-schemas";
import { comparisonFixture } from "./comparison-fixture";

export function candidateFixture() {
  const f = comparisonFixture(),
    id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const policy = {
    version: "type-candidate-criteria-v1" as const,
    overall: {
      min_cases: 1,
      min_groups: 1,
      min_acceptable_bps: 10000,
      max_critical_bps: 0,
      max_unavailable_bps: 0,
      max_regression_bps: 0,
    },
    strata: {
      resolved: null,
      residual: null,
      rare: null,
      insufficient_context: null,
    },
  };
  const reason = "Critérios sintéticos para validar a interface.";
  const rule = {
    min_cases: "1",
    min_groups: "1",
    min_acceptable_bps: "100",
    max_critical_bps: "0",
    max_unavailable_bps: "0",
    max_regression_bps: "0",
  };
  const omitted = () => ({
    choice: "omit" as const,
    rule: {
      min_cases: "",
      min_groups: "",
      min_acceptable_bps: "",
      max_critical_bps: "",
      max_unavailable_bps: "",
      max_regression_bps: "",
    },
  });
  const form: CandidateForm = {
    baseline: f.sources[0].report_id,
    candidate: f.sources[1].report_id,
    reason,
    overall: rule,
    strata: {
      resolved: omitted(),
      residual: omitted(),
      rare: omitted(),
      insufficient_context: omitted(),
    },
  };
  const candidate: CandidateView = {
    document: {
      schema_version: "type-evaluation-candidate-v1",
      id,
      release_id: f.ids.release,
      origin: "synthetic",
      comparison_id: f.comparisonID,
      comparison_digest: f.delivery.digest,
      baseline_report_id: f.sources[0].report_id,
      candidate_report_id: f.sources[1].report_id,
      candidate_report_digest: f.refs[1].expected_digest,
      plan_id: f.sources[1].plan_id,
      definition_digest: f.plan.definition_digest,
      route_digest: f.sources[1].pipeline.configuration_digest,
      route: {
        version: "deadline-type-pipeline-v1",
        mode: "current",
        policy_version: "synthetic-v1",
        endpoint: "http://127.0.0.1:1",
        policy: {
          model: "synthetic/model",
          max_tokens: 800,
          reasoning_tokens: 0,
          timeout_seconds: 30,
        },
      },
      policy,
      reason,
      frozen_at: f.plan.frozen_at,
    },
    digest: "e".repeat(64),
    request_id: f.ids.request,
    eligible: true,
    blockers: [],
    idempotent_replay: false,
    closed_test_available: false,
    production_approved: false,
  };
  const summary = {
    id,
    release_id: f.ids.release,
    comparison_id: f.comparisonID,
    plan_id: f.sources[1].plan_id,
    digest: candidate.digest,
    frozen_at: candidate.document.frozen_at,
  };
  return { ...f, candidateID: id, candidate, policy, form, summary };
}
