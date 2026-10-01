// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ProcessResume } from "./process-resume";

const mock = vi.hoisted(() => ({ api: vi.fn(), scope: "org-a" }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mock.api }));
vi.mock("@/features/ai-feedback/hooks/use-feedback-scope", () => ({
  useFeedbackScope: (id: string) => ({ componentKey: `${mock.scope}:${id}` }),
}));
vi.mock("@/features/ai-feedback/components/ai-feedback", () => ({
  AiFeedback: ({ resultId }: { resultId: string }) => (
    <span data-feedback={resultId} />
  ),
}));
const id = "11111111-1111-4111-8111-111111111111";
const result = {
  summary: "Resumo preservado",
  current_status: "Sintético",
  key_dates_and_deadlines: [],
  recent_movements: [],
  risks: [],
  recommended_actions: [],
  generated_at: "2026-10-01T12:00:00Z",
  ai_result_id: id,
  result_origin: "ai",
};
let root: Root, host: HTMLDivElement, client: QueryClient;
async function render(processId = "process-a") {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ProcessResume processId={processId} />
      </QueryClientProvider>,
    );
  });
}
async function click() {
  await act(async () => {
    host.querySelector("button")!.click();
  });
}
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  mock.api.mockReset();
  mock.scope = "org-a";
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
it("never calls a potentially generating GET on mount/focus and binds feedback to the response", async () => {
  mock.api.mockResolvedValue(result);
  await render();
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new Event("online"));
  expect(mock.api).not.toHaveBeenCalled();
  await click();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
  expect(mock.api).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain(result.summary);
  expect(
    host.querySelector("[data-feedback]")?.getAttribute("data-feedback"),
  ).toBe(id);
});
it("does not retry a failure automatically or attach a CTA to a legacy response", async () => {
  mock.api
    .mockRejectedValueOnce(new Error("connection lost"))
    .mockResolvedValueOnce({
      ...result,
      ai_result_id: undefined,
      result_origin: undefined,
    });
  await render();
  await click();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(mock.api).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await click();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
  expect(host.textContent).toContain(result.summary);
  expect(host.querySelector("[data-feedback]")).toBeNull();
});
it("deduplicates a double click and discards an old response across process/identity changes", async () => {
  let resolve!: (value: unknown) => void;
  mock.api.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await render();
  await act(async () => {
    host.querySelector("button")!.click();
    host.querySelector("button")!.click();
  });
  expect(mock.api).toHaveBeenCalledTimes(1);
  const signal = mock.api.mock.calls[0][1].signal as AbortSignal;
  mock.scope = "org-b";
  await render("process-b");
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve(result);
    await new Promise((r) => setTimeout(r, 5));
  });
  expect(host.textContent).not.toContain(result.summary);
  expect(host.querySelector("[data-feedback]")).toBeNull();
  expect(mock.api).toHaveBeenCalledTimes(1);
});
