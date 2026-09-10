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
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.textContent).toContain("Preparando a redação");
    await act(async () => mocks.stream!.onProgress(""));
    expect(
      container.querySelector('[aria-label="Texto da peça em geração"]'),
    ).toBeNull();
    await act(async () => mocks.stream!.onProgress("Primeiro trecho"));
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
