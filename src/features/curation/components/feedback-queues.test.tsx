// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  feedbackCurationScopeFixture,
  feedbackQueueFixture,
} from "../__tests__/feedback-queue-fixture";
import { BackofficeContext } from "../hooks/use-backoffice-context";
import { FeedbackQueuePage, FeedbackQueueScopePage } from "./feedback-queues";

const mock = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mock.api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push }) }));
let host: HTMLDivElement,
  root: Root,
  client: QueryClient,
  allowed: boolean,
  lost: boolean,
  revoked: boolean;
async function flush() {
  for (let i = 0; i < 3; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
}
async function render(detail = false) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <BackofficeContext.Provider
          value={{
            tenant_id: "internal",
            organization_id: "org",
            user_id: "operator",
            revision: 1,
            capabilities: allowed ? ["curation.admit"] : [],
            requires_organization_switch: false,
          }}
        >
          {detail ? (
            <FeedbackQueuePage id={feedbackQueueFixture.id} />
          ) : (
            <FeedbackQueueScopePage id={feedbackCurationScopeFixture.id} />
          )}
        </BackofficeContext.Provider>
      </QueryClientProvider>,
    ),
  );
  await flush();
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  )!;
  expect(button).toBeTruthy();
  await act(async () => button.click());
  await flush();
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.api.mockReset();
  mock.push.mockReset();
  allowed = true;
  lost = false;
  revoked = false;
  mock.api.mockImplementation(
    async (
      path: string,
      options?: { method?: string; body?: Record<string, unknown> },
    ) => {
      if (revoked) throw new Error("Acesso revogado");
      if (path.endsWith("feedback-curation-scopes"))
        return { data: [feedbackCurationScopeFixture] };
      if (options?.method === "POST") {
        if (lost) {
          lost = false;
          throw new Error("Resposta perdida");
        }
        const body = options.body!;
        return {
          data: {
            ...feedbackQueueFixture,
            from: body.from,
            to: body.to,
            quotas: body.quotas,
          },
        };
      }
      if (path.includes("?scope_id="))
        return { data: [], page: { next_cursor: null, limit: 20 } };
      return { data: feedbackQueueFixture };
    },
  );
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
  vi.unstubAllGlobals();
});

it("creates only after submission and recovers a lost response with the same frozen command", async () => {
  await render();
  expect(
    mock.api.mock.calls.filter(([, o]) => o?.method === "POST"),
  ).toHaveLength(0);
  lost = true;
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
  expect(host.textContent).toContain("O envio pode ter sido salvo");
  expect(host.querySelector("fieldset")!.disabled).toBe(true);
  expect(
    [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Revalidar acesso",
    )!.disabled,
  ).toBe(true);
  const original = mock.api.mock.calls.find(([, o]) => o?.method === "POST")![1]
    .body;
  await click("Recuperar envio");
  const posts = mock.api.mock.calls.filter(([, o]) => o?.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[1][1].body).toEqual(original);
  expect(mock.push).toHaveBeenCalledWith(
    `/backoffice/feedback-queues/${feedbackQueueFixture.id}`,
  );
});
it("shows shortages and frozen signals, then removes them after revoked access", async () => {
  await render(true);
  expect(host.textContent).toContain("24 não preenchidos");
  expect(host.textContent).toContain("4 selecionados entre 12");
  revoked = true;
  await click("Revalidar fila");
  expect(host.textContent).toContain("Fila indisponível");
  expect(host.textContent).not.toContain("4 selecionados entre 12");
  expect(mock.api.mock.calls.every(([, options]) => !options?.method)).toBe(
    true,
  );
});
it("does not query or expose selection without the internal capability", async () => {
  allowed = false;
  await render();
  expect(mock.api).not.toHaveBeenCalled();
  expect(host.textContent).toContain("não inclui seleção");
});
