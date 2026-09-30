// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useAutosTreeQuery } from "@/features/documentos/hooks/_private/use-autos-tree-query";

import { useSyncAutos } from "./use-sync-autos";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  legacy: vi.fn(),
  sync: vi.fn(),
  status: vi.fn(),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("../services/court-connections.service", () => ({
  syncCourtAutos: mocks.sync,
  getCourtAutosSyncStatus: mocks.status,
}));
vi.mock("./use-court-connections", () => ({
  useCourtCatalog: () => ({
    data: {
      data: [
        {
          court: "TJSP",
          system: "EPROC",
          available: true,
          connection_mode: "PERSISTENT",
          capabilities: ["SYNC_AUTOS"],
        },
      ],
    },
    isError: false,
    isPending: false,
  }),
  useCourtConnections: () => ({
    data: [
      {
        id: "connection-1",
        court: "TJSP",
        system: "EPROC",
        status: "CONNECTED",
      },
    ],
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
}));

const autosKeys = [
  ["documentos", "autos", "record-1", "", "newest"],
  ["documentos", "autos", "record-1", "DOC", "oldest"],
] as const;
const legacyKey = ["documentos", "processo", "record-1"] as const;
const page = (ready: boolean) => ({
  data: ready
    ? [
        {
          kind: "unmapped",
          id: "document-1",
          documents: [
            { id: "document-1", status: "READY", title: "Novo auto" },
          ],
        },
      ]
    : [],
  page: {
    next_cursor: null,
    limit: 20,
    total: ready ? 1 : 0,
    total_count: ready ? 1 : 0,
  },
  filters: {},
  document_total: ready ? 1 : 0,
  document_filtered_total: ready ? 1 : 0,
});

let latest: ReturnType<typeof useSyncAutos>;
function Probe() {
  const sync = useSyncAutos({
    courtRecordId: "record-1",
    court: "TJSP",
    degree: "G1",
  });
  useAutosTreeQuery("record-1", "", "newest");
  useAutosTreeQuery("record-1", "DOC", "oldest");
  useQuery({ queryKey: legacyKey, queryFn: mocks.legacy });
  useEffect(() => {
    latest = sync;
  });
  return null;
}

let client: QueryClient;
let root: Root;
let host: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.api.mockReset().mockResolvedValue(page(true));
  mocks.legacy.mockReset().mockResolvedValue("legacy-updated");
  mocks.sync
    .mockReset()
    .mockResolvedValue({ queued: 1, pending: 1, failed: 0, status: "pending" });
  mocks.status
    .mockReset()
    .mockResolvedValue({ queued: 0, pending: 0, failed: 0, status: "idle" });
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(autosKeys[0], {
    pages: [page(false)],
    pageParams: [""],
  });
  const staleReady = page(true);
  staleReady.data[0].documents[0].title = "Auto antigo";
  client.setQueryData(autosKeys[1], {
    pages: [staleReady],
    pageParams: [""],
  });
  client.setQueryData(legacyKey, "legacy-empty");
  client.setQueryData(["autos-status", "record-1"], {
    has_autos: false,
    fetch_running: false,
    last_fetch_status: "none",
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

it("refetches cached empty autos and legacy lists on explicit refresh and sync success", async () => {
  expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => {
    await latest.refreshDocuments();
  });
  expect(mocks.api).toHaveBeenCalledTimes(2);
  for (const key of autosKeys) {
    expect(
      client.getQueryData<{ pages: ReturnType<typeof page>[] }>(key)?.pages[0]
        .data[0].documents[0].status,
    ).toBe("READY");
  }
  expect(
    client.getQueryData<{ pages: ReturnType<typeof page>[] }>(autosKeys[1])
      ?.pages[0].data[0].documents[0].title,
  ).toBe("Novo auto");
  expect(client.getQueryData(legacyKey)).toBe("legacy-updated");
  expect(mocks.legacy).toHaveBeenCalledTimes(1);
  await act(async () => {
    await latest.mutation.mutateAsync();
  });
  await vi.waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(4));
  await vi.waitFor(() => expect(mocks.legacy).toHaveBeenCalledTimes(2));
  expect(mocks.sync).toHaveBeenCalledTimes(1);
  expect(
    client.getQueryState(["autos-status", "record-1"])?.isInvalidated,
  ).toBe(true);
});
