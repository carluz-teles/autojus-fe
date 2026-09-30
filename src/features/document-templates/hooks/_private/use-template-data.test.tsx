// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { DocumentTemplate } from "../../services/document-templates.service";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  selectedDefault: vi.fn(),
  setDefault: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org_A" }),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../../services/document-templates.service", () => ({
  listDocumentTemplates: mocks.list,
  getDocumentTemplateDefault: mocks.selectedDefault,
  setDocumentTemplateDefault: mocks.setDefault,
}));

import { useTemplateData } from "./use-template-data";

let data: ReturnType<typeof useTemplateData>;
let host: HTMLDivElement | undefined;
let root: Root | undefined;

function Probe() {
  const current = useTemplateData();
  useEffect(() => {
    data = current;
  }, [current]);
  return null;
}

async function renderTemplate(
  latestStatus: "READY" | "FAILED",
  archived: boolean,
  defaultVersionId: string,
) {
  const template: DocumentTemplate = {
    id: "template-1",
    name: "Modelo do escritório",
    archived,
    created_at: "2026-01-01T00:00:00Z",
    latest_version: {
      id: "version-2",
      version_no: 2,
      status: latestStatus,
    },
  };
  mocks.list.mockResolvedValue({
    data: [template],
    page: { next_cursor: null, limit: 20 },
  });
  mocks.selectedDefault.mockResolvedValue({
    template_id: template.id,
    version_id: defaultVersionId,
  });
  mocks.setDefault.mockResolvedValue(undefined);

  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    ),
  );
  await vi.waitFor(() => expect(data.rows).toHaveLength(1));
  await vi.waitFor(() => expect(data.selectedDefault.data).toBeDefined());
  return data.rows[0];
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("allows promoting a newer READY version of the already-default model", async () => {
  const row = await renderTemplate("READY", false, "version-1");
  expect(row.isDefault).toBe(true);
  expect(row.defaultIsLatest).toBe(false);
  expect(row.canSetDefault).toBe(true);
  expect(row.latest_version?.id).toBe("version-2");
});

it.each([
  ["the latest version is already default", "READY", false, "version-2"],
  ["the newer version failed", "FAILED", false, "version-1"],
  ["the model is archived", "READY", true, "version-1"],
] as const)(
  "does not offer promotion when %s",
  async (_, status, archived, id) => {
    const row = await renderTemplate(status, archived, id);
    expect(row.canSetDefault).toBe(false);
  },
);
