// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setInstructions } from "../lib/instructions-storage";
import { useConstruction } from "./use-construction";

const mocks = vi.hoisted(() => ({
  saga: "FAILED",
  contentHtml: "",
  theses: [] as { id: string }[],
  thesesError: true,
  regenerateAsync: vi.fn(),
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  setQueryData: vi.fn(),
  streamOptions: null as null | { onDone: (theses: { id: string }[]) => void },
  draftId: "",
  assessmentStatus: "ready" as "ready" | "loading" | "error",
  assessmentRequest: null as null | { status: string },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
}));
vi.mock("@/lib/telemetry/use-ai-experience", () => ({
  useAIExperience: vi.fn(),
}));
vi.mock("./use-draft", () => ({
  useAssessment: () => ({
    data: { request: mocks.assessmentRequest },
    isSuccess: mocks.assessmentStatus === "ready",
    isFetching: mocks.assessmentStatus === "loading",
    isError: mocks.assessmentStatus === "error",
  }),
  useDraft: () => ({
    data: {
      intimation: { id: "int-1", teor: "Intimação com teor." },
      sagaState: mocks.saga,
      contentHtml: mocks.contentHtml,
      instructions: "Instrução persistida",
      currentVersionId: null,
    },
    isLoading: false,
    isError: false,
    dataUpdatedAt: 1,
  }),
}));
vi.mock("./use-theses", () => ({
  thesesKey: (id: string) => ["theses", id],
  useThesesController: () => ({
    theses: mocks.theses,
    selectedIds: mocks.theses.map((t) => t.id),
    isLoading: false,
    isError: mocks.thesesError,
    isRegenerating: false,
    isTogglingId: null,
    regenerate: vi.fn(),
    regenerateAsync: mocks.regenerateAsync,
  }),
  useGenerateDraft: (id: string) => {
    mocks.draftId = id;
    return {
      isPending: false,
      mutate: mocks.mutate,
      mutateAsync: mocks.mutateAsync,
      error: null,
    };
  },
}));
vi.mock("./use-theses-stream", () => ({
  useThesesStream: (_key: string, options: typeof mocks.streamOptions) => {
    mocks.streamOptions = options;
    return { status: "idle", theses: [], count: 0 };
  },
}));

let latest: ReturnType<typeof useConstruction>;
function Probe() {
  const value = useConstruction("draft-1");
  useEffect(() => {
    latest = value;
  });
  return null;
}

describe("useConstruction — dispatch real da geração", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    sessionStorage.clear();
    mocks.saga = "FAILED";
    mocks.contentHtml = "";
    mocks.theses = [];
    mocks.thesesError = true;
    mocks.assessmentStatus = "ready";
    mocks.assessmentRequest = null;
    mocks.regenerateAsync.mockReset();
    mocks.mutate.mockReset();
    mocks.mutateAsync.mockReset().mockResolvedValue({ updated_at: "now" });
    mocks.setQueryData.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(Probe)));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("FAILED + erro de teses → espera o POST de teses e gera uma vez no mesmo draft com orientação", async () => {
    let settle!: (value: { id: string }[]) => void;
    mocks.regenerateAsync.mockImplementation(
      () => new Promise((resolve) => (settle = resolve)),
    );
    setInstructions("draft-1", "Orientação opcional");
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();

    await act(async () => {
      void latest.retryAuto();
      void latest.retryAuto(); // duplo clique não inicia outra tentativa
    });
    expect(mocks.regenerateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(latest.autoFailed).toBe(false);

    await act(async () => settle([{ id: "tese-1" }]));
    expect(mocks.draftId).toBe("draft-1");
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({
      thesisIds: ["tese-1"],
      instructions: "Orientação opcional",
      expectedCurrentVersionId: null,
    });
    expect(sessionStorage.getItem("peca:instructions:draft-1")).toBe(
      "Orientação opcional",
    );
  });

  it("retry com teses assentadas vazias volta ao erro sem chamar geração", async () => {
    mocks.regenerateAsync.mockResolvedValue([]);
    await act(async () => latest.retryAuto());
    expect(mocks.regenerateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(latest.autoFailed).toBe(true);
  });

  it("falha no POST de teses mantém a orientação e permite outra tentativa", async () => {
    setInstructions("draft-1", "Manter fatos adicionais");
    mocks.regenerateAsync.mockRejectedValue(new Error("rede indisponível"));
    await act(async () => latest.retryAuto());
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("peca:instructions:draft-1")).toBe(
      "Manter fatos adicionais",
    );
    mocks.regenerateAsync.mockResolvedValue([{ id: "tese-3" }]);
    await act(async () => latest.retryAuto());
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("retry com teses persistidas gera direto sem chamada paga duplicada", async () => {
    mocks.theses = [{ id: "tese-existente" }];
    mocks.thesesError = false;
    await act(async () => root.render(createElement(Probe)));
    await act(async () => latest.retryAuto());
    expect(mocks.regenerateAsync).not.toHaveBeenCalled();
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({
      thesisIds: ["tese-existente"],
      instructions: "Instrução persistida",
    });
  });

  it("draft CREATED reaberto sem auto=1 dispara uma vez; conteúdo existente não dispara", async () => {
    mocks.saga = "CREATED";
    mocks.thesesError = false;
    mocks.theses = [{ id: "tese-2" }];
    await act(async () => root.render(createElement(Probe)));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0].thesisIds).toEqual(["tese-2"]);

    mocks.contentHtml = "<p>Minuta existente</p>";
    mocks.saga = "DRAFTED";
    await act(async () => root.render(createElement(Probe)));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it("stream assentado vazio sai do loading para erro sem geração", async () => {
    mocks.saga = "CREATED";
    mocks.thesesError = false;
    await act(async () => root.render(createElement(Probe)));
    expect(latest.autoFailed).toBe(false);
    await act(async () => {
      mocks.streamOptions!.onDone([]);
      root.render(createElement(Probe));
    });
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("remount de CREATED vazio com assessment FAILED mostra retry sem auto-mutation", async () => {
    mocks.saga = "CREATED";
    mocks.thesesError = false;
    mocks.theses = [{ id: "tese-2" }];
    mocks.assessmentRequest = { status: "failed" };
    await act(async () => root.render(createElement(Probe)));
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(createElement(Probe)));
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it.each(["loading", "error"] as const)(
    "assessment read %s blocks automatic paid work",
    async (status) => {
      mocks.saga = "CREATED";
      mocks.thesesError = false;
      mocks.theses = [{ id: "tese-2" }];
      mocks.assessmentStatus = status;
      if (status === "loading") mocks.assessmentRequest = { status: "failed" }; // stale cache
      await act(async () => root.render(createElement(Probe)));
      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(latest.autoFailed).toBe(status === "error");
    },
  );

  it("failed assessment retries once explicitly with the same draft and input", async () => {
    mocks.saga = "CREATED";
    mocks.thesesError = false;
    mocks.theses = [{ id: "tese-2" }];
    mocks.assessmentRequest = { status: "failed" };
    setInstructions("draft-1", "Orientação opcional");
    await act(async () => root.render(createElement(Probe)));
    await act(async () => {
      void latest.retryAuto();
      void latest.retryAuto();
    });
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.draftId).toBe("draft-1");
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({
      thesisIds: ["tese-2"],
      instructions: "Orientação opcional",
    });
  });

  it("active assessment is reused by the existing auto lifecycle; completed content does not restart", async () => {
    mocks.saga = "CREATED";
    mocks.thesesError = false;
    mocks.theses = [{ id: "tese-2" }];
    mocks.assessmentRequest = { status: "running" };
    await act(async () => root.render(createElement(Probe)));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    mocks.saga = "DRAFTED";
    mocks.contentHtml = "<p>Minuta pronta</p>";
    await act(async () => root.render(createElement(Probe)));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});
