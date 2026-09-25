// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AutosStatus } from "@/features/intimacoes/services/autos-status.service";

import { PecaGateModal, type PecaGateModalProps } from "./peca-gate-modal";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));
vi.mock("@/features/configuracoes/hooks/use-sync-autos", () => ({
  useSyncAutos: () => ({
    mutation: { mutate: vi.fn(), isPending: false },
    requesting: false,
    pending: false,
    reason: undefined,
  }),
}));
vi.mock(
  "@/features/prazos/components/intimacao-detalhe/definir-tipo-ato",
  () => ({
    DefinirTipoAto: () => null,
  }),
);
vi.mock("@base-ui/react/dialog", async () => {
  const { createElement, Fragment } = await import("react");
  const wrap = (tag: "div" | "h2" | "p") =>
    function Wrapper({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) {
      return createElement(tag, props, children);
    };
  return {
    Dialog: {
      Root: ({ open, children }: React.PropsWithChildren<{ open: boolean }>) =>
        open ? createElement(Fragment, null, children) : null,
      Portal: wrap("div"),
      Backdrop: wrap("div"),
      Popup: wrap("div"),
      Title: wrap("h2"),
      Description: wrap("p"),
      Close: () => null,
    },
  };
});

const props: PecaGateModalProps = {
  open: false,
  onOpenChange: vi.fn(),
  intimacaoId: "int-1",
  processoId: "record-1",
  prazo: null,
  tipoConfirmado: true,
  onProceed: vi.fn(),
  onConfigurarTribunal: vi.fn(),
  onRevisarIntimacao: vi.fn(),
};

function response(overrides: Partial<AutosStatus> = {}): AutosStatus {
  return {
    has_autos: true,
    tribunal_configured: true,
    tribunal_available: true,
    fetch_running: true,
    court: "TJSP",
    system: null,
    ...overrides,
  };
}

describe("PecaGateModal — consulta de autos ao abrir", () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  async function render(open: boolean) {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(PecaGateModal, { ...props, open }),
        ),
      );
    });
  }

  async function settleQuery() {
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("não consulta fechado; aberto consulta o record correto, espera e reconhece autos existentes", async () => {
    let resolve!: (value: AutosStatus) => void;
    mocks.fetch.mockReturnValue(
      new Promise<AutosStatus>((done) => {
        resolve = done;
      }),
    );

    await render(false);
    expect(mocks.fetch).not.toHaveBeenCalled();

    await render(true);
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      "/v1/processos/record-1/autos-status",
    );
    expect(container.textContent).toContain("Verificando os autos do processo");
    expect(container.textContent).not.toContain(
      "Processo sem autos carregados",
    );

    await act(async () => resolve(response()));
    await settleQuery();
    expect(container.textContent).toContain("Tudo pronto para a peça");
    expect(container.textContent).toContain(
      "Os autos deste processo já estão carregados",
    );
    expect(container.textContent).not.toContain("Gerar mesmo assim");
  });

  it("resposta sem autos mostra aviso e caminho acionável do tribunal", async () => {
    mocks.fetch.mockResolvedValue(response({ has_autos: false }));
    await render(true);
    await settleQuery();

    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      "/v1/processos/record-1/autos-status",
    );
    expect(container.textContent).toContain("Processo sem autos carregados");
    expect(container.textContent).toContain("Priorize esta intimação");
    expect(container.textContent).toContain("Gerar mesmo assim");
  });

  it("falha na consulta informa erro sem fingir indisponibilidade do tribunal", async () => {
    mocks.fetch.mockRejectedValue(new Error("network"));
    await render(true);
    await settleQuery();

    expect(container.textContent).toContain(
      "Não foi possível verificar os autos agora",
    );
    expect(container.textContent).not.toContain(
      "A importação automática de autos ainda não está disponível",
    );
  });

  it("reviews the formal item before autos and confirms it only on explicit click", async () => {
    let confirmed = false;
    mocks.fetch.mockImplementation(
      async (path: string, options?: { method: string }) => {
        if (path.endsWith("/confirmar")) {
          confirmed = true;
          return { data: {} };
        }
        if (path === "/v1/action-items/item-1")
          return {
            data: {
              id: "item-1",
              intimation_id: "int-1",
              tipo: "manifestar",
              piece_profile_key: "manifestacao",
              gera_peca: true,
              tipo_status: confirmed ? "confiavel" : "a_confirmar",
              status: "SUGGESTED",
              draft_id: null,
            },
          };
        expect(options).toBeUndefined();
        return response();
      },
    );
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(PecaGateModal, {
            ...props,
            open: true,
            actionItemId: "item-1",
          }),
        ),
      );
    });
    await settleQuery();
    expect(container.textContent).toContain("Confirme o tipo de trabalho");
    expect(container.textContent).toContain("Manifestar-se");
    expect(container.textContent).toContain("Manifestação");
    expect(container.textContent).not.toContain("Tudo pronto para a peça");
    expect(mocks.fetch).not.toHaveBeenCalledWith(
      "/v1/action-items/item-1/confirmar",
      expect.anything(),
    );
    const confirm = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Confirmar tipo e continuar"),
    );
    expect(confirm).toBeTruthy();
    await act(async () => confirm!.click());
    await settleQuery();
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/v1/action-items/item-1/confirmar",
      { method: "POST" },
    );
    expect(container.textContent).toContain("Tudo pronto para a peça");
  });
});
