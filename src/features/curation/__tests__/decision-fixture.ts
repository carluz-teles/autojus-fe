import type { DecisionPreview } from "../services/annotation-decisions";
import { annotationDefaults } from "../services/annotation-form";
import { intimationAnnotationSchema } from "../services/annotation-schema";
import { annotationFixture } from "./annotation-fixture";

export function decisionFixture(): DecisionPreview {
  const input = annotationFixture();
  const answer = annotationDefaults(input);
  answer.label.answerability = "insufficient";
  answer.label.missing_context = ["Destinatário"];
  answer.label.abstention_reason = "Contexto sintético insuficiente.";
  return {
    task_id: input.assignment.task_id,
    snapshot: input.snapshot,
    snapshot_digest: input.snapshot_digest,
    protocol: input.protocol,
    group_source_ids: ["synthetic-source"],
    origin: "synthetic",
    split: "train",
    revision: 0,
    previous_decision_id: null,
    input_digest: "d".repeat(64),
    reviews: [
      {
        submission_id: "synthetic-submission",
        person_id: "synthetic-reviewer",
        mode: "blind",
        digest: "c".repeat(64),
        qualified: true,
        grant_reference: null,
        independent: true,
        annotation: intimationAnnotationSchema.parse(answer),
      },
    ],
    alerts: [],
    assessment: {
      policy_version: "annotation-decision-policy-v1",
      ready: true,
      required_reviews: 1,
      qualified_reviews: 1,
      independent_reviews: 1,
      critical: false,
      differences: [],
      blockers: [],
    },
    source_purposes: ["evaluation"],
  };
}
