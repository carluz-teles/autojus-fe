import { describe, expect, it } from "vitest";

import { annotationFixture } from "../__tests__/annotation-fixture";
import {
  annotationActTypeLabel,
  annotationDefaults,
  annotationForSubmission,
  changeAnnotationDeadline,
  deadlineFromCue,
  emptyAnnotationAct,
  restoreAnnotationDraft,
} from "./annotation-form";
import { evidenceFromSelection } from "./annotation-schema";

describe("annotation questionnaire mapping", () => {
  it("uses the frozen catalog label and never collapses unknown types into Prazo", () => {
    expect(
      annotationActTypeLabel("manifestacao_generica", {
        manifestacao_generica: "Manifestação",
      }),
    ).toBe("Manifestação");
    expect(annotationActTypeLabel("recurso_ordinario")).toBe(
      "recurso_ordinario",
    );
    expect(annotationActTypeLabel("ciencia")).toBe("Ciência");
  });
  it("starts unanswered in both modes and never autofills model hints", () => {
    for (const mode of ["blind", "assisted"] as const) {
      const values = annotationDefaults(annotationFixture(mode));
      expect(values.label.acts).toEqual([]);
      expect(values.label.answerability).toBe("");
    }
  });
  it("restores incomplete drafts but refuses foreign or unknown content", () => {
    const input = annotationFixture(),
      base = annotationDefaults(input);
    const restored = restoreAnnotationDraft(
      {
        label: {
          acts: [
            {
              recipient: "client",
              deadline: {
                kind: "unknown",
                reason: "Synthetic unresolved context",
              },
            },
          ],
        },
      },
      base,
    );
    expect(restored.label.acts[0].deadline.quantity).toBeNull();
    expect(restored.label.acts[0].recipient).toBe("client");
    expect(() =>
      restoreAnnotationDraft({ snapshot_digest: "c".repeat(64) }, base),
    ).toThrow("outro texto");
    expect(() =>
      restoreAnnotationDraft({ label: { poisoned: true } }, base),
    ).toThrow();
    expect(base.label.acts).toHaveLength(0);
  });
  it("keeps multiple acts, Unicode evidence, and partial period separate from due date", () => {
    const input = annotationFixture(),
      values = annotationDefaults(input),
      text = input.snapshot.facts.text;
    const start = text.indexOf("15 dias úteis"),
      proof = evidenceFromSelection(
        text,
        start,
        start + "15 dias úteis".length,
      );
    values.label = {
      answerability: "partial",
      missing_context: [" calendário ", ""],
      abstention_reason: null,
      acts: [
        {
          ...emptyAnnotationAct(),
          act_type: "manifestacao_generica",
          recipient: "client",
          actionability: "duty",
          evidence: proof,
          deadline: deadlineFromCue({
            ...proof,
            quantity: 15,
            unit: "business_days",
            exact_source_span: true,
          }),
        },
        {
          ...emptyAnnotationAct(),
          act_type: "ciencia",
          recipient: "both",
          actionability: "awareness",
          evidence: evidenceFromSelection(
            text,
            text.indexOf("Ciência"),
            text.length,
          ),
          deadline: {
            ...emptyAnnotationAct().deadline,
            kind: "none",
            date_status: "not_applicable",
            reason: "Somente ciência no exemplo sintético.",
          },
        },
      ],
    };
    const result = annotationForSubmission(values, input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.label.acts).toHaveLength(2);
    expect(result.data.label.missing_context).toEqual(["calendário"]);
    expect(result.data.label.acts[0].deadline.due_date).toBeNull();
    expect(proof.start).toBeGreaterThan(start);
    expect(values.label.missing_context).toEqual([" calendário ", ""]);
  });
  it("never invents a unit or reuses incompatible event/date fields", () => {
    const cue = {
      quantity: 15,
      unit: "" as const,
      quote: "15 dias",
      start: 0,
      end: 7,
      exact_source_span: true,
    };
    expect(deadlineFromCue(cue).unit).toBeNull();
    expect(() =>
      deadlineFromCue({ ...cue, exact_source_span: false }),
    ).toThrow();
    const scheduled = {
      ...emptyAnnotationAct().deadline,
      kind: "scheduled_date",
      event: "Audiência",
      due_date: "2026-10-01",
      quantity: 15,
    };
    const changed = changeAnnotationDeadline(scheduled, "none");
    expect(changed).toMatchObject({
      date_status: "not_applicable",
      quantity: null,
      due_date: null,
      event: null,
    });
  });
});
