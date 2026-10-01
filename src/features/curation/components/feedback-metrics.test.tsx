// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { metricsFixture } from "../__tests__/feedback-metrics-fixture";
import { BackofficeContext } from "../hooks/use-backoffice-context";
import { FeedbackMetricsPage, FeedbackMetricsScopes } from "./feedback-metrics";

const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mock.api }));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  fail: boolean,
  suppressed: boolean,
  allowed: boolean;
const metricsCalls = () =>
  mock.api.mock.calls.filter(([path]) => path.includes("/metrics?"));
async function flush() {
  for (let i = 0; i < 3; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
}
async function render(detail = true) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <BackofficeContext.Provider
          value={{
            tenant_id: "internal",
            organization_id: "internal-org",
            user_id: "operator",
            revision: 1,
            capabilities: allowed ? ["curation.read"] : [],
            requires_organization_switch: false,
          }}
        >
          {detail ? (
            <FeedbackMetricsPage id={metricsFixture.scope.id} />
          ) : (
            <FeedbackMetricsScopes />
          )}
        </BackofficeContext.Provider>
      </QueryClientProvider>,
    ),
  );
  await flush();
}
async function submit() {
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.api.mockReset();
  fail = false;
  suppressed = false;
  allowed = true;
  mock.api.mockImplementation(async (path: string) => {
    if (path.endsWith("feedback-scopes"))
      return { data: [metricsFixture.scope] };
    if (fail) throw new Error("revoked");
    const url = new URL(path, "http://synthetic.invalid");
    return {
      data: {
        ...metricsFixture,
        period_start: url.searchParams.get("from"),
        period_end: url.searchParams.get("to"),
        rows: metricsFixture.rows.map((row) => ({
          ...row,
          counts: suppressed ? null : row.counts,
        })),
      },
    };
  });
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

it("queries only after selecting a period and removes old totals after a failed refresh", async () => {
  await render();
  expect(metricsCalls()).toHaveLength(0);
  await submit();
  expect(metricsCalls()).toHaveLength(1);
  expect(host.textContent).toContain("1 de 2 (50%)");
  expect(host.textContent).toContain("2 de 3 (67%)");
  fail = true;
  await submit();
  expect(metricsCalls()).toHaveLength(2);
  expect(host.textContent).toContain("Relatório indisponível");
  expect(host.textContent).not.toContain("1 de 2 (50%)");
});

it("shows suppression rather than zero counts and has no generation or training command", async () => {
  suppressed = true;
  await render();
  await submit();
  expect(host.textContent).toContain("Contagens ocultas");
  expect(host.querySelector("dl")).toBeNull();
  expect(mock.api.mock.calls.every(([, options]) => !options?.method)).toBe(
    true,
  );
});

it("does not fetch reports or scopes without the internal capability", async () => {
  allowed = false;
  await render(false);
  expect(mock.api).not.toHaveBeenCalled();
  expect(host.textContent).toContain("não inclui leitura de feedback");
});
