// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionItemView } from "@/features/action-items/types";

import {
  peekInstructions,
  setInstructions,
} from "../../lib/instructions-storage";
import { ConstructionEntry } from "./construction-entry";

const mocks = vi.hoisted(() => ({
  getActionItem: vi.fn(),
  confirmarActionItem: vi.fn(),
  iniciarActionItem: vi.fn(),
  createDraft: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  search: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  useSearchParams: () => mocks.search,
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("@/features/action-items/services/action-items.service", () => ({
  getActionItem: mocks.getActionItem,
  confirmarActionItem: mocks.confirmarActionItem,
  iniciarActionItem: mocks.iniciarActionItem,
}));
vi.mock("../../services/pecas-v2.service", () => ({
  createDraft: mocks.createDraft,
}));

function item(overrides: Partial<ActionItemView> = {}): ActionItemView {
  return {
    id: "item-1",
    intimation_id: "int-1",
    title: "Manifestar",
    description: "Sobre o documento",
    tipo: "manifestar",
    gera_peca: true,
    piece_profile_key: "manifestacao",
    tipo_origem: "ia",
    tipo_status: "confiavel",
    status: "SUGGESTED",
    due_date: null,
    completed_at: null,
    created_at: "2026-09-24T00:00:00Z",
    updated_at: "2026-09-24T00:00:00Z",
    ...overrides,
  };
}

describe("ConstructionEntry — fresh detail and explicit type review", () => {
  let root: Root;
  let container: HTMLDivElement;
  let qc: QueryClient;
  async function render(props: React.ComponentProps<typeof ConstructionEntry>) {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(ConstructionEntry, props),
        ),
      );
    });
    await settle();
  }
  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(label),
    );
    expect(button, `button ${label}`).toBeTruthy();
    await act(async () => button!.click());
    await settle();
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    sessionStorage.clear();
    mocks.search = new URLSearchParams();
    mocks.getActionItem.mockReset();
    mocks.confirmarActionItem.mockReset().mockResolvedValue(item());
    mocks.iniciarActionItem
      .mockReset()
      .mockResolvedValue(item({ status: "TODO" }));
    mocks.createDraft.mockReset().mockResolvedValue({ id: "draft-new" });
    mocks.replace.mockReset();
    mocks.push.mockReset();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    qc.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("reabre draft vinculado mesmo com trabalho encerrado", async () => {
    mocks.getActionItem.mockResolvedValue(
      item({ draft_id: "draft-existing", status: "DONE" }),
    );
    await render({ actionItemId: "item-1", intimationId: "int-1", auto: true });
    expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/pecas/draft-existing?auto=1&retorno=%2Fintimacoes%2Fint-1",
    );
  });

  it("reabre draft antigo sem intimação de origem mesmo com trabalho encerrado", async () => {
    mocks.getActionItem.mockResolvedValue(
      item({ intimation_id: "", draft_id: "draft-existing", status: "DONE" }),
    );
    await render({ actionItemId: "item-1", auto: true });
    expect(mocks.confirmarActionItem).not.toHaveBeenCalled();
    expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(
      "/pecas/draft-existing?auto=1&retorno=%2Ftriagem",
    );
  });

  it("não reabre draft vinculado a outra intimação conhecida", async () => {
    mocks.getActionItem.mockResolvedValue(
      item({
        intimation_id: "int-other",
        draft_id: "draft-existing",
        status: "DONE",
      }),
    );
    await render({ actionItemId: "item-1", intimationId: "int-1", auto: true });
    expect(container.textContent).toContain(
      "A providência não pertence a esta intimação",
    );
    expect(mocks.confirmarActionItem).not.toHaveBeenCalled();
    expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("cria peça opcional pela intimação sem iniciar item anterior", async () => {
    setInstructions("int-1", "Incluir documento juntado");
    mocks.getActionItem.mockResolvedValue(item({ gera_peca: false }));
    await render({
      intimationId: "int-1",
      existingActionItemId: "item-1",
      auto: true,
    });
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.any(Function), {
      intimationId: "int-1",
    });
    expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
    expect(peekInstructions("draft-new")).toBe("Incluir documento juntado");
  });

  it.each(["SUGGESTED", "TODO", "WORKING"] as const)(
    "requires explicit confirmation of %s before creating one draft",
    async (status) => {
      let current = item({ status, tipo_status: "a_confirmar" });
      mocks.getActionItem.mockImplementation(async () => current);
      mocks.confirmarActionItem.mockImplementation(async () => {
        current = item({ status, tipo_status: "confiavel" });
        return current;
      });
      setInstructions("item-1", "Foco preservado");
      mocks.search = new URLSearchParams(
        "retorno=%2Fintimacoes%2Fint-1%3Ftab%3Dmesa",
      );
      await render({
        actionItemId: "item-1",
        intimationId: "int-1",
        auto: true,
      });
      expect(container.textContent).toContain("Confirme o tipo de trabalho");
      expect(mocks.confirmarActionItem).not.toHaveBeenCalled();
      expect(mocks.iniciarActionItem).not.toHaveBeenCalled();
      expect(mocks.createDraft).not.toHaveBeenCalled();
      await click("Confirmar tipo e continuar");
      expect(mocks.confirmarActionItem).toHaveBeenCalledTimes(1);
      expect(mocks.iniciarActionItem).toHaveBeenCalledTimes(
        status === "SUGGESTED" ? 1 : 0,
      );
      expect(mocks.createDraft).toHaveBeenCalledTimes(1);
      expect(peekInstructions("draft-new")).toBe("Foco preservado");
      expect(mocks.replace).toHaveBeenCalledWith(
        "/pecas/draft-new?auto=1&retorno=%2Fintimacoes%2Fint-1%3Ftab%3Dmesa",
      );
    },
  );

  it("cancel makes no write and preserves focus", async () => {
    mocks.getActionItem.mockResolvedValue(item({ tipo_status: "a_confirmar" }));
    setInstructions("item-1", "Foco");
    await render({ actionItemId: "item-1", intimationId: "int-1" });
    await click("Cancelar");
    expect(mocks.push).toHaveBeenCalledWith("/intimacoes/int-1");
    expect(mocks.confirmarActionItem).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(peekInstructions("item-1")).toBe("Foco");
  });

  it("confirmation failure stays on review and can retry without duplicate create", async () => {
    let current = item({ tipo_status: "a_confirmar" });
    mocks.getActionItem.mockImplementation(async () => current);
    mocks.confirmarActionItem
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(async () => {
        current = item();
        return current;
      });
    await render({ actionItemId: "item-1" });
    await click("Confirmar tipo e continuar");
    expect(container.textContent).toContain(
      "Não foi possível confirmar o tipo",
    );
    expect(mocks.createDraft).not.toHaveBeenCalled();
    await click("Confirmar tipo e continuar");
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
  });

  it("after iniciar succeeds but create fails, retry re-reads TODO and does not iniciar again", async () => {
    let current = item();
    mocks.getActionItem.mockImplementation(async () => current);
    mocks.iniciarActionItem.mockImplementation(async () => {
      current = item({ status: "TODO" });
      return current;
    });
    mocks.createDraft
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ id: "draft-new" });
    await render({ actionItemId: "item-1" });
    expect(container.textContent).toContain("network");
    await click("Tentar novamente");
    expect(mocks.iniciarActionItem).toHaveBeenCalledTimes(1);
    expect(mocks.createDraft).toHaveBeenCalledTimes(2);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
  });

  it("stale trusted cache yields inline review after fresh detail says a_confirmar", async () => {
    qc.setQueryData(["action-items", "detail", "item-1"], item());
    mocks.getActionItem.mockResolvedValue(item({ tipo_status: "a_confirmar" }));
    await render({ actionItemId: "item-1" });
    expect(container.textContent).toContain("Confirme o tipo de trabalho");
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it("rapid confirmation clicks submit one POST while pending", async () => {
    let resolve!: (value: ActionItemView) => void;
    let current = item({ tipo_status: "a_confirmar" });
    mocks.getActionItem.mockImplementation(async () => current);
    mocks.confirmarActionItem.mockImplementation(
      () =>
        new Promise<ActionItemView>((done) => {
          resolve = done;
        }),
    );
    await render({ actionItemId: "item-1" });
    const button = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Confirmar tipo e continuar"),
    )!;
    await act(async () => {
      button.click();
      button.click();
    });
    await settle();
    expect(mocks.confirmarActionItem).toHaveBeenCalledTimes(1);
    expect(
      [...container.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Confirmar tipo e continuar"),
      )?.disabled,
    ).toBe(true);
    await act(async () => {
      current = item();
      resolve(current);
    });
    await settle();
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
  });

  it("optional lookup cannot convert a formal item into intimation-only generation", async () => {
    mocks.getActionItem.mockResolvedValue(item({ tipo_status: "a_confirmar" }));
    await render({ intimationId: "int-1", existingActionItemId: "item-1" });
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Esta providência gera peça");
    await click("Voltar à intimação");
    expect(mocks.push).toHaveBeenCalledWith("/intimacoes/int-1");
  });

  it.each([
    { origin_review_required: true },
    { gera_peca: false },
    { status: "DONE" as const },
    { intimation_id: "" },
    { intimation_id: "other" },
  ])("blocks ineligible new work and offers return", async (overrides) => {
    mocks.getActionItem.mockResolvedValue(item(overrides));
    await render({ actionItemId: "item-1", intimationId: "int-1" });
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Voltar à intimação");
  });
});
