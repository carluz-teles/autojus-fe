// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setInstructions } from "../../lib/instructions-storage";
import { ConstructionEntry } from "./construction-entry";

const mocks = vi.hoisted(() => ({
  work: null as null | {
    intimation_id: string;
    draft_id: string | null;
    gera_peca: boolean;
    tipo_status: string;
    status: string;
    title: string;
    description: string;
  },
  getActionItem: vi.fn(),
  createDraft: vi.fn(),
  iniciarActionItem: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
  useMutation: (options: {
    mutationFn: () => Promise<string>;
    onSuccess: (id: string) => Promise<void>;
  }) => ({
    mutate: () => {
      void options.mutationFn().then(options.onSuccess);
    },
    isError: false,
    isPending: false,
  }),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("@/features/action-items/hooks/use-action-items", () => ({
  useActionItemDetalhe: () => ({ data: mocks.work, isError: false }),
}));
vi.mock("@/features/action-items/services/action-items.service", () => ({
  getActionItem: mocks.getActionItem,
  iniciarActionItem: mocks.iniciarActionItem,
}));
vi.mock("../../services/pecas-v2.service", () => ({
  createDraft: mocks.createDraft,
}));

describe("ConstructionEntry — peça opcional", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    sessionStorage.clear();
    mocks.work = null;
    mocks.getActionItem.mockReset();
    mocks.createDraft.mockReset().mockResolvedValue({ id: "draft-new" });
    mocks.iniciarActionItem.mockReset();
    mocks.replace.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("reabre o draft já ligado ao item sem criar outro", async () => {
    mocks.getActionItem.mockResolvedValue({
      intimation_id: "int-1",
      draft_id: "draft-existing",
    });
    await act(async () => {
      root.render(
        createElement(ConstructionEntry, {
          intimationId: "int-1",
          existingActionItemId: "item-1",
          auto: true,
        }),
      );
    });
    expect(mocks.getActionItem).toHaveBeenCalledWith(
      expect.any(Function),
      "item-1",
    );
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/pecas/draft-existing?auto=1&retorno=%2Fintimacoes%2Fint-1",
    );
  });

  it("sem draft no item cria intimation-only sem alterar a obrigação", async () => {
    setInstructions("int-1", "Incluir documento juntado");
    mocks.getActionItem.mockResolvedValue({
      intimation_id: "int-1",
      draft_id: null,
    });
    await act(async () => {
      root.render(
        createElement(ConstructionEntry, {
          intimationId: "int-1",
          existingActionItemId: "item-1",
          auto: true,
        }),
      );
    });
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.any(Function), {
      intimationId: "int-1",
    });
    expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("peca:instructions:draft-new")).toBe(
      "Incluir documento juntado",
    );
    expect(mocks.replace).toHaveBeenCalledWith(
      "/pecas/draft-new?auto=1&retorno=%2Fintimacoes%2Fint-1",
    );
  });

  it("item gera_peca=true mantém criação pelo action item", async () => {
    mocks.work = {
      intimation_id: "int-1",
      draft_id: null,
      gera_peca: true,
      tipo_status: "confiavel",
      status: "SUGGESTED",
      title: "Manifestar",
      description: "Sobre o documento",
    };
    await act(async () => {
      root.render(
        createElement(ConstructionEntry, {
          actionItemId: "item-formal",
          auto: true,
        }),
      );
    });
    expect(mocks.iniciarActionItem).toHaveBeenCalledWith(
      expect.any(Function),
      "item-formal",
    );
    expect(mocks.createDraft).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        actionItemId: "item-formal",
        intimationId: "int-1",
        title: "Manifestar",
      }),
    );
  });
});
