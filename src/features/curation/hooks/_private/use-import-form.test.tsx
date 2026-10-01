// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
const router = { push: mocks.push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { importFileExample } from "../../services/import-form";
import { useImportForm } from "./use-import-form";

let current: ReturnType<typeof useImportForm>;
function Harness() {
  const value = useImportForm();
  useEffect(() => {
    current = value;
  });
  return (
    <form onSubmit={value.submit}>
      <input aria-label="name" {...value.form.register("name")} />
      <p>{value.form.formState.errors.root?.serverError?.message}</p>
    </form>
  );
}
let root: Root, host: HTMLDivElement, client: QueryClient;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

describe("import form recovery", () => {
  it("keeps input and reuses the request after uncertain network failure", async () => {
    mocks.api
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({
        data: {
          request_id: "receipt",
          replayed: true,
          batch: { id: "batch-1" },
        },
      });
    await act(async () => {
      current.form.setValue("name", "Synthetic batch");
      current.form.setValue("mode", "json");
      current.form.setValue("structured_text", importFileExample);
    });
    await act(async () => {
      await current.submit();
    });
    expect(current.form.getValues("structured_text")).toBe(importFileExample);
    expect(host.textContent).toContain("Connection lost");
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(mocks.api.mock.calls[0][1].serializedJson).toBe(
      mocks.api.mock.calls[1][1].serializedJson,
    );
    expect(mocks.push).toHaveBeenCalledWith("/backoffice/imports/batch-1");
  });
  it("does not call the API for an empty manual text or a non-array structured file", async () => {
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    await act(async () => {
      current.form.setValue("name", "Synthetic batch");
      current.form.setValue("mode", "json");
      current.form.setValue("structured_text", "{}");
    });
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(current.form.getValues("structured_text")).toBe("{}");
  });
});
