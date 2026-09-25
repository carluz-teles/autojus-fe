// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IntimacaoView } from "@/features/intimacoes/types";
import { useTriagemPipeline } from "@/features/triagem/hooks/use-triagem-pipeline";

import { BulkBar, type BulkKind } from "./bulk-bar";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  rows: [] as IntimacaoView[],
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/features/intimacoes/hooks/use-intimacoes", async (original) => {
  const actual = await original();
  return {
    ...actual,
    useIntimacoes: () => ({
      intimacoes: mocks.rows,
      isPending: false,
      isFetching: false,
      isLoadingMore: false,
      error: null,
      hasMore: false,
      totalCount: mocks.rows.length,
      processCount: 1,
      buckets: {},
      totalWithoutUrgency: mocks.rows.length,
      paginationKey: "fixture",
      loadMore: vi.fn(),
      refetch: vi.fn(),
    }),
    usePipelineCounts: () => ({
      counts: {
        by_lifecycle: {
          a_triar: {
            total: 2,
            analisando: 2,
            trabalho: 0,
            excecao: 0,
            ciencia: 0,
            sem_prazo: 0,
          },
          em_andamento: {
            total: 0,
            analisando: 0,
            trabalho: 0,
            excecao: 0,
            ciencia: 0,
            sem_prazo: 0,
          },
          concluido: {
            total: 0,
            analisando: 0,
            trabalho: 0,
            excecao: 0,
            ciencia: 0,
            sem_prazo: 0,
          },
        },
      },
      isPending: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
  };
});
vi.mock("@/features/captures/hooks/use-captures", () => ({
  useCaptures: () => ({ data: { runs: [] } }),
}));
vi.mock("@/features/onboarding/hooks/use-me", () => ({
  useMe: () => ({ data: { user_id: "me-1" } }),
}));
vi.mock("@/features/organization/hooks/use-org-members-directory", () => ({
  useOrgMembersDirectory: () => ({ members: [] }),
}));
vi.mock("@/features/intimacoes/hooks/use-painel-detalhe", () => ({
  usePainelDetalhe: () => ({ id: null, abrir: vi.fn(), fechar: vi.fn() }),
}));
vi.mock("@/features/intimacoes/hooks/use-fila-navigation", () => ({
  useFiltrosDaFila: () => ({ get: () => "", set: vi.fn() }),
}));

function item(id: string): IntimacaoView {
  return {
    id,
    cnj_number: "0000000-00.2026.8.26.0001",
    class: "",
    subject: "",
    title: "Intimação",
    autor: "",
    reu: "",
    court_record_id: "cr-1",
    court: "TJSP",
    degree: "G1",
    type: "INTIMACAO",
    status: "ACTIVE",
    user_status: "PENDING",
    resolution: "",
    resolved_at: null,
    source: "DJEN",
    source_url: "",
    made_available_at: "2026-09-01T00:00:00Z",
    published_at: "2026-09-01T00:00:00Z",
    deadline_start_at: "2026-09-01T00:00:00Z",
    content_preview: "",
    estado: "sem_prazo",
    prazo: null,
    ai_analyzed_at: null,
    assignee_user_id: null,
    assignee_user_name: null,
    work_stage: "RECEIVED",
    recommended_providencia: null,
    suggested_count: 0,
    categoria_coarse: "intimacao",
    acionabilidade: "",
    provisorio: false,
    lifecycle: "a_triar",
    disposicao: "analisando",
    is_excecao: false,
    excecao_motivo: "",
  };
}

function Probe() {
  const m = useTriagemPipeline();
  function onBulk(kind: BulkKind) {
    if (kind === "ciencia") void m.darCiencia(m.selectedIds);
    else void m.atribuir(m.selectedIds, "me-1");
  }
  return (
    <>
      <button onClick={() => m.toggleSelect("i-1")}>Selecionar 1</button>
      <button onClick={() => m.toggleSelect("i-2")}>Selecionar 2</button>
      <output data-testid="selection">{m.selectedIds.join(",")}</output>
      {m.selectedIds.length > 0 && (
        <BulkBar
          count={m.selectedIds.length}
          pending={m.mutating}
          onBulk={onBulk}
          onClear={m.clearSelection}
        />
      )}
    </>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("BulkBar with real Triagem mutation hook", () => {
  let root: Root;
  let host: HTMLDivElement;
  let qc: QueryClient;
  async function settle() {
    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
  }
  function button(label: string): HTMLButtonElement {
    const found = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes(label),
    );
    expect(found, `button ${label}`).toBeTruthy();
    return found!;
  }
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.rows = [item("i-1"), item("i-2")];
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root.render(
        <QueryClientProvider client={qc}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
    await act(async () => {
      button("Selecionar 1").click();
      button("Selecionar 2").click();
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    qc.clear();
    host.remove();
    vi.unstubAllGlobals();
  });

  it("blocks rapid repeat and competing bulk actions, then retains failed IDs and unlocks", async () => {
    const first = deferred<IntimacaoView>();
    const second = deferred<IntimacaoView>();
    mocks.fetch.mockImplementation((path: string) =>
      path.includes("i-1") ? first.promise : second.promise,
    );
    await act(async () => {
      button("Dar ciência").click();
      button("Atribuir a mim").click();
      button("Dar ciência").click();
    });
    await settle();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(button("Dar ciência").disabled).toBe(true);
    expect(button("Atribuir a mim").disabled).toBe(true);
    expect(button("Limpar").disabled).toBe(true);
    await act(async () => {
      first.resolve(item("i-1"));
      second.reject(new Error("network"));
    });
    await settle();
    expect(host.querySelector("output")?.textContent).toBe("i-2");
    expect(button("Dar ciência").disabled).toBe(false);
    expect(button("Atribuir a mim").disabled).toBe(false);
    expect(button("Limpar").disabled).toBe(false);
    expect(mocks.toastSuccess).toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it("blocks same-render repeat on assignment and unlocks after rejection", async () => {
    const first = deferred<IntimacaoView>();
    const second = deferred<IntimacaoView>();
    mocks.fetch.mockImplementation((path: string) =>
      path.includes("i-1") ? first.promise : second.promise,
    );
    await act(async () => {
      button("Atribuir a mim").click();
      button("Dar ciência").click();
      button("Atribuir a mim").click();
    });
    await settle();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(button("Dar ciência").disabled).toBe(true);
    expect(button("Atribuir a mim").disabled).toBe(true);
    await act(async () => {
      first.reject(new Error("network"));
      second.reject(new Error("network"));
    });
    await settle();
    expect(host.querySelector("output")?.textContent).toBe("i-1,i-2");
    expect(button("Dar ciência").disabled).toBe(false);
    expect(button("Atribuir a mim").disabled).toBe(false);
  });

  it("releases the hook guard after a rejected batch mutation so the same selection can retry", async () => {
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    invalidate.mockRejectedValueOnce(new Error("cache unavailable"));
    mocks.fetch.mockImplementation(async () => item("i-1"));
    await act(async () => button("Dar ciência").click());
    await settle();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Não foi possível registrar a ciência.",
    );
    expect(host.querySelector("output")?.textContent).toBe("i-1,i-2");
    expect(button("Dar ciência").disabled).toBe(false);
    await act(async () => button("Dar ciência").click());
    await settle();
    expect(mocks.fetch).toHaveBeenCalledTimes(4);
    expect(host.querySelector("output")?.textContent).toBe("");
    invalidate.mockRestore();
  });
});
