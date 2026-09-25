// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CourtConnectionView } from "../types/court-connection";
import {
  COURT_CONNECTIONS_QUERY_KEY,
  useDeleteCourtConnection,
} from "./use-court-connections";

const remove = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../services/court-connections.service", () => ({
  deleteCourtConnection: remove,
}));

const connection = (id: string): CourtConnectionView => ({
  id,
  court: "TJSP",
  system: id === "one" ? "EPROC" : "ESAJ",
  authentication_method: "CERTIFICATE_A1",
  status: "ERROR",
  created_at: "2026-09-25",
});
let latest: ReturnType<typeof useDeleteCourtConnection>;
function Probe() {
  const mutation = useDeleteCourtConnection();
  useEffect(() => {
    latest = mutation;
  });
  return null;
}

describe("remove court connection", () => {
  let client: QueryClient;
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    remove.mockReset();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [
      connection("one"),
      connection("two"),
    ]);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(QueryClientProvider, { client }, createElement(Probe)),
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    client.clear();
    vi.unstubAllGlobals();
  });
  it("does not send DELETE until confirmed; success removes only the selected ID", async () => {
    expect(remove).not.toHaveBeenCalled();
    remove.mockResolvedValue(undefined);
    await act(async () => {
      await latest.mutateAsync("one");
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(COURT_CONNECTIONS_QUERY_KEY)).toEqual([
      connection("two"),
    ]);
  });
  it("keeps the selected connection visible if DELETE fails", async () => {
    remove.mockRejectedValue(new Error("offline"));
    await act(async () => {
      await expect(latest.mutateAsync("one")).rejects.toThrow("offline");
    });
    expect(client.getQueryData(COURT_CONNECTIONS_QUERY_KEY)).toEqual([
      connection("one"),
      connection("two"),
    ]);
  });
});
