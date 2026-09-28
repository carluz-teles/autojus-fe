// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { COURT_CONNECTIONS_QUERY_KEY } from "./use-court-connections";
import { useTestCourtConnection } from "./use-test-court-connection";

const connect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../services/court-connections.service", () => ({
  connectCourtConnection: connect,
}));
let latest: ReturnType<typeof useTestCourtConnection>;
function Probe() {
  const mutation = useTestCourtConnection();
  useEffect(() => {
    latest = mutation;
  });
  return null;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it.each(["ERROR", "MFA_REQUIRED"] as const)(
  "does not keep a false connected state for HTTP 200 %s",
  async (status) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const client = new QueryClient();
    const connected = {
      id: "one",
      court: "TJSP",
      system: "EPROC",
      status: "CONNECTED",
    };
    client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [connected]);
    connect.mockResolvedValue({ ...connected, status });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(QueryClientProvider, { client }, createElement(Probe)),
      ),
    );
    await act(async () => {
      await latest.mutateAsync("one");
    });
    expect(client.getQueryData(COURT_CONNECTIONS_QUERY_KEY)).toEqual([
      { ...connected, status },
    ]);
    await act(async () => root.unmount());
    container.remove();
    client.clear();
  },
);
