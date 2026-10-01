// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onClickAbrirLinha } from "../lib/painel-click";
import { briefSummaryResult } from "../services/brief-summary-result";
import { BriefSummaryFeedback } from "./brief-summary-feedback";

vi.mock("@/features/ai-feedback/components/ai-feedback", () => ({
  AiFeedback: ({ resultId }: { resultId: string }) => (
    <span data-vote={resultId}>Vote</span>
  ),
}));
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
describe("brief summary feedback", () => {
  const first = "11111111-1111-4111-8111-111111111111";
  const second = "22222222-2222-4222-8222-222222222222";
  it("requires an explicit summary reference and never borrows the analysis identity", async () => {
    expect(
      briefSummaryResult({ brief_summary: "Resumo", ai_result_id: first }),
    ).toBeNull();
    expect(
      briefSummaryResult({ brief_summary: "", brief_summary_result_id: first }),
    ).toBeNull();
    expect(
      briefSummaryResult({
        brief_summary: "Resumo",
        brief_summary_result_id: "invalid",
      }),
    ).toBeNull();
    await render(<BriefSummaryFeedback result={null} />);
    expect(host.innerHTML).toBe("");
  });
  it("opens full literal text before feedback and resets for a new result", async () => {
    const result = briefSummaryResult({
      brief_summary: "<b>Resumo completo</b>",
      brief_summary_result_id: first,
    });
    const navigate = vi.fn();
    await render(
      <div onClick={(e) => onClickAbrirLinha(e, navigate)}>
        <BriefSummaryFeedback result={result} />
      </div>,
    );
    expect(host.querySelector("[data-vote]")).toBeNull();
    await open();
    expect(host.querySelector("[data-vote]")?.getAttribute("data-vote")).toBe(
      first,
    );
    expect(host.textContent).toContain("<b>Resumo completo</b>");
    expect(host.querySelector("b")).toBeNull();
    await act(async () => host.querySelector("p")!.click());
    expect(navigate).not.toHaveBeenCalled();
    await render(
      <div onClick={(e) => onClickAbrirLinha(e, navigate)}>
        <BriefSummaryFeedback
          result={briefSummaryResult({
            brief_summary: "Novo resumo",
            brief_summary_result_id: second,
          })}
        />
      </div>,
    );
    expect(host.querySelector("[data-vote]")).toBeNull();
    await open();
    expect(host.querySelector("[data-vote]")?.getAttribute("data-vote")).toBe(
      second,
    );
    expect(host.textContent).not.toContain("<b>Resumo completo</b>");
  });
});
