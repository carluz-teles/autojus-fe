import { describe, expect, it, vi } from "vitest";

import { decisionFixture } from "../__tests__/decision-fixture";
import { decisionCommand, getDecisionInput } from "./annotation-decisions";
import { emptyAnnotationAct } from "./annotation-form";
import { evidenceFromSelection } from "./annotation-schema";

describe("decision boundaries", () => {
  it("normalizes a cleared context textarea just like the annotation submission", () => {
    const input = decisionFixture();
    const annotation = structuredClone(input.reviews[0].annotation);
    const act = emptyAnnotationAct();
    act.act_type = "ciencia";
    act.recipient = "both";
    act.actionability = "awareness";
    act.evidence = evidenceFromSelection(
      input.snapshot.facts.text,
      0,
      input.snapshot.facts.text.length,
    );
    act.deadline.kind = "none";
    act.deadline.date_status = "not_applicable";
    act.deadline.reason = "Ciência sintética sem prazo.";
    const edited = {
      ...annotation,
      label: {
        answerability: "determinate",
        missing_context: [""],
        acts: [act],
        abstention_reason: null,
      },
    };
    const command = decisionCommand(
      input,
      { outcome: "corrected", selected: "", reason: "Conferido." },
      edited,
      "request",
    );
    expect(command.annotation?.label.missing_context).toEqual([]);
    expect(command.annotation?.label.acts[0].act_type).toBe("ciencia");
  });
  it("binds every review and the displayed revision without changing an accepted answer", () => {
    const input = decisionFixture();
    const command = decisionCommand(
      input,
      { outcome: "insufficient", selected: "", reason: "Contexto ausente." },
      input.reviews[0].annotation,
      "request",
    );
    expect(command).toMatchObject({
      expected_revision: input.revision,
      previous_decision_id: input.previous_decision_id,
      expected_input_digest: input.input_digest,
      submission_ids: input.reviews.map((r) => r.submission_id),
      annotation: input.reviews[0].annotation,
    });
    expect(() =>
      decisionCommand(
        input,
        { outcome: "accepted", selected: "foreign", reason: "Conferido." },
        input.reviews[0].annotation,
        "r",
      ),
    ).toThrow();
  });
  it("requires readiness, reasons and correct outcome semantics", () => {
    const input = decisionFixture();
    expect(() =>
      decisionCommand(
        input,
        {
          outcome: "accepted",
          selected: input.reviews[0].submission_id,
          reason: "Conferido.",
        },
        input.reviews[0].annotation,
        "r",
      ),
    ).toThrow(/insuficiente/i);
    expect(() =>
      decisionCommand(
        input,
        { outcome: "rejected", selected: "", reason: " " },
        null,
        "r",
      ),
    ).toThrow();
    expect(
      decisionCommand(
        input,
        {
          outcome: "rejected",
          selected: "",
          reason: "Excluído por evidência inadequada.",
        },
        null,
        "r",
      ).annotation,
    ).toBeNull();
    input.assessment.ready = false;
    expect(() =>
      decisionCommand(
        input,
        { outcome: "rejected", selected: "", reason: "Não apto." },
        null,
        "r",
      ),
    ).toThrow(/revisões/i);
  });
  it("rejects responses for another task or text before displaying peer answers", async () => {
    const input = decisionFixture();
    const api = vi.fn().mockResolvedValue({ data: input });
    await expect(getDecisionInput(api, "foreign")).rejects.toThrow();
    input.reviews[0].annotation.snapshot_digest = "f".repeat(64);
    await expect(getDecisionInput(api, input.task_id)).rejects.toThrow();
  });
});
