// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { classificationResult } from "../services/classification-result";
import { ClassificationResult } from "./classification-result";

vi.mock("@/features/ai-feedback/components/ai-feedback", () => ({
  AiFeedback: ({ resultId }: { resultId: string }) => (
    <span data-vote={resultId}>Vote</span>
  ),
}));

const deadlineId = "11111111-1111-4111-8111-111111111111";
const first = "22222222-2222-4222-8222-222222222222";
const second = "33333333-3333-4333-8333-333333333333";
const input = {
  ai_result_id: first,
  result_origin: "ai_with_rules",
  deadline_id: deadlineId,
  recorded_at: "2026-10-01T12:00:00Z",
  state: "answered",
  application: "applied",
  suggested_type: "manifestacao_documento",
  suggested_label: "Manifestação sobre documento",
  resolved_label: "Manifestação sobre documento",
  alternative: "",
  alternative_label: "",
  requires_review: true,
  provisional: false,
  calculation: {
    schema_version: 1,
    tipo_ato: "manifestacao_documento",
    days: 15,
    counting: "BUSINESS",
    doubled: false,
    manual_extra_days: 0,
    start_date: "2026-10-01",
    end_date: "2026-10-23",
    legal_citation: "<b>Base literal</b>",
  },
};

let root: Root, host: HTMLDivElement;
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(node: ReactNode) {
  await act(async () => root.render(node));
}
async function open() {
  await act(async () => {
    const details = host.querySelector("details")!;
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
  });
}

describe("original classification feedback", () => {
  it("requires its own identity and the matching deadline, excluding unapplied private evidence", async () => {
    for (const value of [
      null,
      {},
      { ...input, ai_result_id: undefined },
      { ...input, result_origin: "rule" },
      { ...input, deadline_id: second },
      { ...input, application: "not_applied" },
    ]) {
      expect(classificationResult(value, deadlineId)).toBeNull();
    }
    expect(classificationResult(input)).toBeNull();
    await render(<ClassificationResult result={null} />);
    expect(host.innerHTML).toBe("");
  });

  it("shows original type and rule dates before mounting the vote and resets for another generation", async () => {
    await render(
      <ClassificationResult result={classificationResult(input, deadlineId)} />,
    );
    expect(host.querySelector("[data-vote]")).toBeNull();
    await open();
    expect(host.querySelector("[data-vote]")?.getAttribute("data-vote")).toBe(
      first,
    );
    expect(host.textContent).toContain("Manifestação sobre documento");
    expect(host.textContent).toContain("15 dias úteis, a partir de 01/10/2026");
    expect(host.textContent).toContain("23/10/2026");
    expect(host.textContent).toContain("<b>Base literal</b>");
    expect(host.querySelector("b")).toBeNull();
    await render(
      <ClassificationResult
        result={classificationResult(
          { ...input, ai_result_id: second },
          deadlineId,
        )}
      />,
    );
    expect(host.querySelector("[data-vote]")).toBeNull();
    await open();
    expect(host.querySelector("[data-vote]")?.getAttribute("data-vote")).toBe(
      second,
    );
  });

  it("represents abstention without presenting zero days as a legal deadline", async () => {
    const result = classificationResult(
      {
        ...input,
        state: "abstained",
        suggested_type: "",
        suggested_label: "",
        resolved_label: "",
        calculation: {
          ...input.calculation,
          tipo_ato: "indeterminado",
          days: 0,
          end_date: null,
          legal_citation: null,
        },
      },
      deadlineId,
    );
    await render(<ClassificationResult result={result} />);
    await open();
    expect(host.textContent).toContain("Não foi possível sugerir um ato");
    expect(host.textContent).toContain(
      "Nenhuma data determinada nesta resposta",
    );
    expect(host.textContent).not.toContain("0 dias");
    expect(host.textContent).not.toContain("23/10/2026");
  });
});
