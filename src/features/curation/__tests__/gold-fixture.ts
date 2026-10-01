import type { GoldPreview } from "../services/annotation-gold";
export const preview: GoldPreview = {
  decision_id: "decision",
  task_id: "task",
  source_link_id: "source",
  revision: 0,
  previous_revision_id: null,
  origin: "synthetic",
  quality: "assisted_reviewed",
  split: "train",
  legal_date: "2026-09-30",
  purposes: ["evaluation"],
  policy_version: "annotation-gold-policy-v1",
  eligible: true,
  blockers: [],
};
