// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/api/use-api", () => ({
  useApi: () => vi.fn(),
  usePresignedStorage: () => ({ getBlob: vi.fn() }),
}));
vi.mock("../../services/document-templates.service", () => ({
  getDocumentTemplate: vi.fn().mockResolvedValue({ versions: [] }),
  downloadDocumentTemplatePreview: vi.fn(),
}));

import { useTemplatePreview } from "./use-template-preview";

let preview: ReturnType<typeof useTemplatePreview>;
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

function Probe({ orgId }: { orgId: string }) {
  const current = useTemplatePreview(orgId, null);
  useEffect(() => {
    preview = current;
  }, [current]);
  return null;
}

async function renderOrg(orgId: string) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe orgId={orgId} />
      </QueryClientProvider>,
    ),
  );
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient();
  await renderOrg("org_A");
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("does not reopen the previous office's preview after A→B→A", async () => {
  await act(async () => preview.openById("template-A", "Modelo A"));
  expect(preview.isWizardOpen).toBe(true);

  await renderOrg("org_B");
  await renderOrg("org_A");

  expect(preview.isWizardOpen).toBe(false);
  expect(preview.isListOpen).toBe(false);
  expect(preview.name).toBe("");
});
