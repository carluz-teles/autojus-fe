// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SamplingPopulation } from "../services/sampling";
import { useSamplingForm } from "./use-sampling";

const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
const original: SamplingPopulation = {
  digest: "a".repeat(64),
  sources: [
    {
      source_link_id: "source",
      case_version_id: "version",
      origin: "synthetic",
      matter_key: "civel",
      legal_date: "2026-09-01",
      knowledge_as_of: "2026-09-29T00:00:00Z",
      purposes: ["evaluation"],
      reserved_split: null,
    },
  ],
};
let current: ReturnType<typeof useSamplingForm>,
  population: SamplingPopulation,
  root: Root,
  host: HTMLDivElement,
  client: QueryClient;
function Harness() {
  const value = useSamplingForm(population);
  useEffect(() => {
    current = value;
  });
  return (
    <form onSubmit={value.submit}>
      <p>{value.form.formState.errors.root?.serverError?.message}</p>
    </form>
  );
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  population = original;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render();
  await act(async () => {
    current.form.setValue("lineage_key", "synthetic:pilot");
    current.form.setValue("seed", "synthetic:seed");
    current.form.setValue("origin", "synthetic");
    current.form.setValue("screening.source", {
      stratum: "residual",
      reason: "synthetic:screening",
    });
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

describe("sampling form recovery", () => {
  it("recovers the exact request after a lost response and a changed population", async () => {
    mocks.api
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ data: { id: "frame" } });
    await act(async () => {
      await current.submit();
    });
    expect(current.uncertain).toBe(true);
    population = { ...original, digest: "b".repeat(64) };
    await render();
    expect(current.outdated).toBe(true);
    await act(async () => {
      current.form.setValue("seed", "edited-after-failure");
      await current.recover();
    });
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(mocks.api.mock.calls[1][1].body).toEqual(
      mocks.api.mock.calls[0][1].body,
    );
    expect(mocks.push).toHaveBeenCalledWith("/backoffice/sampling/frame");
  });
  it("preserves screening on explicit reconciliation but requires newly eligible cases", async () => {
    population = {
      digest: "b".repeat(64),
      sources: [
        ...original.sources,
        { ...original.sources[0], source_link_id: "new-source" },
      ],
    };
    await render();
    await act(async () => current.reconcile());
    expect(current.form.getValues("screening.source.reason")).toBe(
      "synthetic:screening",
    );
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(host.textContent).toContain("todos os casos");
  });
  it("does not silently replace an uncertain command with edited data", async () => {
    mocks.api.mockRejectedValue(new Error("Connection lost"));
    await act(async () => {
      await current.submit();
    });
    await act(async () => current.form.setValue("seed", "edited"));
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("envio anterior");
  });
});
