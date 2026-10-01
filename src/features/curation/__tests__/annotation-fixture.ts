import type { AnnotationAssignmentInput } from "../services/annotation-assignments";

export function annotationFixture(
  mode: "blind" | "assisted" = "blind",
): AnnotationAssignmentInput {
  return {
    assignment: {
      id: "synthetic-assignment",
      task_id: "synthetic-task",
      slot: mode === "blind" ? 1 : 0,
      mode,
      prediction_id: mode === "assisted" ? "synthetic-prediction" : null,
      state: "active",
      revision: 1,
      lease_until: new Date(Date.now() + 30 * 60_000).toISOString(),
      created_at: new Date().toISOString(),
      valid: true,
    },
    snapshot: {
      facts: {
        text: "Intime-se a parte autora: manifestação em 15 dias úteis. Ciência às partes.",
        context: {
          court: "TJ sintético",
          procedure: "Cível",
          channel: "DJE",
          legal_date: "2026-09-30",
          publication_date: null,
          recipient_role: null,
          notes: null,
        },
      },
      case_version_id: "synthetic-version",
      legal_date: "2026-09-30",
      knowledge_as_of: "2026-09-30T00:00:00Z",
      protocol_id: "synthetic-protocol",
      protocol_digest: "b".repeat(64),
    },
    snapshot_digest: "a".repeat(64),
    protocol: {
      act_type_labels: {
        manifestacao_generica: "Manifestação",
        ciencia: "Ciência",
      },
      task_kind: "intimation.classification.v1",
      contract: {
        schema_version: "intimation-label-v1",
        catalog_version: "synthetic:catalog",
        normalization_version: "identity-utf8-v1",
        act_types: ["manifestacao_generica", "ciencia"],
        legal_rules: {},
      },
      rule_sources: {},
      rubric: "Rubrica exclusivamente sintética para teste de interface.",
      review_policy: {
        ordinary_reviews: 1,
        conflict_reviews: 2,
        critical_reviews: 2,
      },
      review_reference: "synthetic:review",
      reviewed_at: "2026-09-30T00:00:00Z",
      grant_reference: null,
      reason: "Synthetic fixture",
    },
    draft: {
      assignment_id: "synthetic-assignment",
      revision: 0,
      annotation: null,
      updated_at: null,
    },
    ...(mode === "assisted"
      ? {
          prediction: {
            id: "synthetic-prediction",
            engine_version: "snapshot-rules-v1",
            suggestion: {
              act_type: "manifestacao_generica",
              motor_actionability: "",
              origin: "synthetic",
              type_requires_review: true,
              interest_requires_review: true,
              procedure_override: "",
              type_in_catalog: true,
              deadline_cues: [],
            },
          },
        }
      : {}),
  };
}
