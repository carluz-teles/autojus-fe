// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IntimacaoDetalheView } from "@/features/intimacoes/types";
import { ApiError } from "@/lib/api/errors";

import type { PrazoDetalheView } from "../types";
import { useIntimacaoDetalhe } from "./use-intimacao-detalhe";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ orgId: null }) }));

const intimation = {
  id: "intimation-1",
  cnj_number: "",
  title: "Intimação",
  autor: "",
  reu: "",
  source: "eproc",
  source_url: "",
  made_available_at: "",
  deadline_start_at: "",
  type: "INTIMACAO",
  phase: "",
  ai_act: "",
  judging_body: "",
  court: "",
  published_at: "",
  class: "",
  subject: "",
  degree: "G1",
  court_record_id: "case-1",
  user_status: "PENDING",
  resolution: "",
  work_stage: "AWAITING_CONFIRMATION",
  assignee_user_id: null,
  assignee_user_name: null,
  ai_analyzed_at: null,
  ai_providencias: [],
  recipients: [],
  history: [],
  content: "",
  estado: "divergente",
  prazo: {
    deadline_id: "deadline-1",
    status: "OPEN",
    end_date: "2026-09-22",
    days_left: 2,
    confirmed: false,
    origem: "divergente",
    selo: "a_apurar",
    tipo_ato: "contestacao",
    prazo_interno: null,
  },
} as IntimacaoDetalheView;

function deadline(revision: number): PrazoDetalheView {
  return {
    id: "deadline-1",
    intimation_id: "intimation-1",
    court_record_id: "case-1",
    cnj_number: "",
    court: "",
    source: "eproc",
    status: "OPEN",
    tipo_ato: "contestacao",
    tipo_ato_origem: "ia",
    start_date: "2026-09-01",
    end_date: "2026-09-22",
    days: 15,
    days_left: 2,
    counting: "BUSINESS",
    doubled: false,
    doubled_reason: "",
    holidays_applied: [],
    confirmed: false,
    rules_version: "v1",
    review_revision: revision,
    current_calculation: null,
    calculation_audit_status: "unavailable",
    cross_validation: {
      data_declarada: "2026-09-20",
      data_calculada: "2026-09-22",
      dif_dias: 2,
      resultado: "divergente",
      decisao: "",
    },
  } as PrazoDetalheView;
}

let hook: ReturnType<typeof useIntimacaoDetalhe> | null = null;
function Probe() {
  const value = useIntimacaoDetalhe("intimation-1");
  useEffect(() => {
    hook = value;
  });
  return null;
}
const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("apuração de divergência pelo hook real do detalhe", () => {
  let root: Root;
  let container: HTMLDivElement;
  let qc: QueryClient;
  let currentDeadline: PrazoDetalheView;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    hook = null;
    currentDeadline = deadline(7);
    mocks.fetch.mockImplementation((path: string) => {
      if (path === "/v1/intimacoes/intimation-1")
        return Promise.resolve(intimation);
      if (path === "/v1/prazos/deadline-1")
        return Promise.resolve(currentDeadline);
      if (path === "/v1/prazos/tipos")
        return Promise.resolve({
          rules_version: "v1",
          rito: "comum_civel",
          items: [],
        });
      if (path === "/v1/prazos/deadline-1/apurar-divergencia")
        return Promise.resolve({});
      throw new Error(`unexpected ${path}`);
    });
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(Probe),
        ),
      ),
    );
    await vi.waitFor(() => expect(hook?.prazoDetalhe?.review_revision).toBe(7));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    qc.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([
    [
      "declarado",
      "onAceitarDeclarado",
      { decisao: "aceita_declarado", expected_revision: 7 },
    ],
    [
      "calculado",
      "onAceitarCalculado",
      { decisao: "aceita_calculado", expected_revision: 7 },
    ],
    [
      "ajuste",
      "onAjusteManual",
      {
        decisao: "ajuste_manual",
        end_date: "2026-09-25",
        expected_revision: 7,
      },
    ],
  ] as const)(
    "envia a revisão exibida ao aceitar %s",
    async (_name, action, body) => {
      await act(async () => {
        if (action === "onAjusteManual") hook!.onAjusteManual("2026-09-25");
        else hook![action]();
      });
      expect(mocks.fetch).toHaveBeenCalledWith(
        "/v1/prazos/deadline-1/apurar-divergencia",
        { method: "POST", body },
      );
    },
  );

  it("bloqueia nova decisão durante 409 e libera apenas após receber a revisão atual", async () => {
    let resolveRefresh!: (value: PrazoDetalheView) => void;
    const refresh = new Promise<PrazoDetalheView>((resolve) => {
      resolveRefresh = resolve;
    });
    mocks.fetch.mockImplementation((path: string) => {
      if (path === "/v1/intimacoes/intimation-1")
        return Promise.resolve(intimation);
      if (path === "/v1/prazos/deadline-1") return refresh;
      if (path === "/v1/prazos/tipos")
        return Promise.resolve({
          rules_version: "v1",
          rito: "comum_civel",
          items: [],
        });
      if (path === "/v1/prazos/deadline-1/apurar-divergencia")
        return Promise.reject(
          new ApiError("CONFLICT", "Revisão obsoleta", 409, {
            code: "REVIEW_STALE",
          }),
        );
      throw new Error(`unexpected ${path}`);
    });
    await act(async () => hook!.onAceitarDeclarado());
    await flush();
    expect(hook!.apuracaoObsoleta).toBe(true);
    expect(hook!.apuracaoErro).toBe(false);
    await act(async () => hook!.onAceitarCalculado());
    expect(
      mocks.fetch.mock.calls.filter(
        ([path]) => path === "/v1/prazos/deadline-1/apurar-divergencia",
      ),
    ).toHaveLength(1);
    await act(async () => resolveRefresh(deadline(8)));
    await flush();
    expect(hook!.prazoDetalhe?.review_revision).toBe(8);
    expect(hook!.apuracaoObsoleta).toBe(false);
    expect(hook!.apuracaoErro).toBe(false);
  });
});
