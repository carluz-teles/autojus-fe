// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GerandoCenter } from "./gerando-center";

type StreamCallbacks = {
  onProgress: (markdown: string) => void;
  onStage: (stage: string) => void;
  onError: () => void;
  onDone: (state: string) => void;
};
const mocks = vi.hoisted(() => ({
  stream: null as StreamCallbacks | null,
  invalidate: vi.fn(),
}));
vi.mock("@/lib/telemetry/use-ai-experience", () => ({
  useAIExperience: vi.fn(),
}));
vi.mock("../../hooks/use-draft-stream", () => ({
  useDraftStream: (_id: string, options: StreamCallbacks) => {
    mocks.stream = options;
  },
}));
vi.mock("../../hooks/use-draft", () => ({
  draftKeys: { detail: (id: string) => ["draft", id] },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));

describe("Transição da preparação para a folha", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.invalidate.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: true,
        }),
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("abre a folha no primeiro texto, sem esperar a conclusão", async () => {
    await act(async () => mocks.stream!.onStage("drafting_sections"));
    // Still on loader (phase 4 active, no content yet)
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.textContent).toContain("Redigindo a minuta");
    await act(async () => mocks.stream!.onProgress(""));
    expect(
      container.querySelector('[aria-label="Texto da peça em geração"]'),
    ).toBeNull();
    await act(async () => mocks.stream!.onProgress("Primeiro trecho"));
    // Sheet opened — loader gone, writing panel shown
    expect(container.querySelector("ol")).toBeNull();
    expect(
      container.querySelector('[aria-label="Texto da peça em geração"]')
        ?.textContent,
    ).toContain("Primeiro trecho");
    expect(container.textContent).toContain("Redação em andamento");
    expect(mocks.invalidate).not.toHaveBeenCalled();
    await act(async () =>
      mocks.stream!.onProgress("Primeiro trecho, continuando a minuta."),
    );
    expect(container.textContent).toContain("continuando a minuta.");
    await act(async () => mocks.stream!.onDone("DRAFTED"));
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ["draft", "qa"],
    });
  });

  it("mantém a folha aberta em uma nova tentativa e informa falha de conexão", async () => {
    await act(async () => mocks.stream!.onProgress("Minuta parcial"));
    await act(async () => {
      mocks.stream!.onStage("safe_fallback");
      mocks.stream!.onProgress("");
    });
    expect(container.querySelector("ol")).toBeNull();
    expect(
      container.querySelector('[aria-label="Texto da peça em geração"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Refazendo a minuta");
    await act(async () => mocks.stream!.onError());
    expect(container.textContent).toContain("Acompanhamento interrompido");
    await act(async () => mocks.stream!.onProgress("Nova minuta"));
    expect(container.textContent).not.toContain("Acompanhamento interrompido");
    expect(container.textContent).toContain("Nova minuta");
  });
});

describe("4-phase loader sem timers", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.invalidate.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("sem thesesDone mostra fase 1 ativa (Consultando teses)", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa2",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: false,
          thesesDone: false,
        }),
      ),
    );
    expect(container.textContent).toContain("Consultando teses");
    // Phase 1 active: aria-current="step"
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Consultando teses");
  });

  it("thesesDone=true sem stage mostra fase 2 ativa (Reunindo o contexto)", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa3",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: false,
          thesesDone: true,
        }),
      ),
    );
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Reunindo o contexto");
  });

  it("assessmentActive=true mantém fase 2 (conferência) sem stage do stream", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa3b",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: false,
          // teses ainda não resolvidas localmente, mas a conferência já roda:
          thesesDone: false,
          assessmentActive: true,
        }),
      ),
    );
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Reunindo o contexto");
  });

  it("stage loading_context avança para fase 2", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa4",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: true,
          thesesDone: true,
        }),
      ),
    );
    await act(async () => mocks.stream!.onStage("loading_context"));
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Reunindo o contexto");
  });

  it("stage analyzing_sources avança para fase 3", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa5",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: true,
          thesesDone: true,
        }),
      ),
    );
    await act(async () => mocks.stream!.onStage("analyzing_sources"));
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Consultando os autos");
  });

  it("stage drafting_sections avança para fase 4", async () => {
    await act(async () =>
      root.render(
        createElement(GerandoCenter, {
          draftId: "qa6",
          startedAt: "2026-09-09T12:10:56.662788Z",
          streamEnabled: true,
          thesesDone: true,
        }),
      ),
    );
    await act(async () => mocks.stream!.onStage("drafting_sections"));
    const active = container.querySelector('[aria-current="step"]');
    expect(active?.textContent).toContain("Redigindo a minuta");
  });
});
