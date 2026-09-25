// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import type {
  CalculationSnapshot,
  DimensionReview,
  PrazoDetalheView,
  PrazoReviewPreviewResult,
} from "../types";
import { useConfirmacaoPrazo } from "./use-confirmacao-prazo";
import { useDefinirTipo } from "./use-definir-tipo";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));

const pending: DimensionReview = {
  status: "pending",
  origin: "ia",
  reason_codes: ["ai_inferred"],
  reason: "Confira a publicação.",
  confirmed_by_id: null,
  confirmed_by_name: null,
  confirmed_at: null,
  can_review: true,
};
const calculation: CalculationSnapshot = {
  schema_version: 1,
  tipo_ato: "impugnacao_cumprimento",
  rito: "comum_civel",
  rule_key: "impugnacao_cumprimento",
  fallback_used: false,
  reason: null,
  source: "rule",
  protected: false,
  days: 15,
  counting: "BUSINESS",
  doubled: false,
  manual_extra_days: 0,
  anchor_event: "PUBLISHED",
  start_date: "2026-09-01",
  end_date: "2026-09-24",
  legal_citation: "art. 525, CPC",
  holidays_applied: [],
  calendar_provider_version: null,
};
function prazo(over: Partial<PrazoDetalheView> = {}): PrazoDetalheView {
  return {
    id: "deadline-1",
    intimation_id: "intimation-1",
    tipo_ato: "cumprimento_sentenca",
    tipo_ato_origem: "ia",
    end_date: "2026-09-08",
    start_date: "2026-09-01",
    days: 5,
    days_left: 2,
    counting: "BUSINESS",
    doubled: false,
    doubled_reason: "",
    status: "OPEN",
    holidays_applied: [],
    confirmed: false,
    court_record_id: "case-1",
    cnj_number: "",
    court: "",
    source: "eproc",
    rules_version: "v1",
    confirmacao_exigida: true,
    prazo_interno: "2026-09-08",
    review_revision: 7,
    review: { tipo: pending, prazo: pending },
    current_calculation: null,
    calculation_audit_status: "unavailable",
    provisorio: true,
    no_deadline_reason: null,
    ...over,
  };
}
function preview(
  dimension: "tipo" | "prazo",
  revision = 7,
  calc = calculation,
): PrazoReviewPreviewResult {
  return {
    review_revision: revision,
    preview_token: `${dimension}-${revision}`,
    dimension,
    tipo_ato: calc.tipo_ato,
    calculation: calc,
    preserved_deadline: calc.protected,
    impact_reason: calc.protected ? "Data atual preservada" : null,
  };
}

let current = prazo();
let typeHook: ReturnType<typeof useDefinirTipo> | null = null;
let deadlineHook: ReturnType<typeof useConfirmacaoPrazo> | null = null;
function TypeProbe() {
  const hook = useDefinirTipo({
    intimacaoId: current.intimation_id,
    prazo: current,
  });
  useEffect(() => {
    typeHook = hook;
  });
  return null;
}
function DeadlineProbe() {
  const hook = useConfirmacaoPrazo(current.intimation_id, current, "ia");
  useEffect(() => {
    deadlineHook = hook;
  });
  return null;
}
const tick = async (ms = 340) =>
  act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });

describe("revisão real de tipo e prazo com transporte mockado", () => {
  let root: Root;
  let container: HTMLDivElement;
  let qc: QueryClient;
  async function render(which: "type" | "deadline") {
    await act(async () =>
      root.render(
        createElement(
          QueryClientProvider,
          { client: qc },
          createElement(which === "type" ? TypeProbe : DeadlineProbe),
        ),
      ),
    );
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    current = prazo();
    typeHook = null;
    deadlineHook = null;
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

  it("NO_DEADLINE/CLASSIFICAR_MANUAL com ambiguous_type usa o catálogo e habilita a prévia de Tipo", async () => {
    current = prazo({
      status: "NO_DEADLINE",
      no_deadline_reason: "CLASSIFICAR_MANUAL",
      tipo_ato: "indeterminado",
      review: {
        tipo: { ...pending, reason_codes: ["ambiguous_type"] },
        prazo: { ...pending, can_review: false },
      },
    });
    mocks.fetch.mockImplementation((path: string) => {
      if (path.endsWith("/tipos"))
        return Promise.resolve({
          rules_version: "v1",
          rito: "comum_civel",
          items: [
            {
              key: "contestacao",
              label: "Contestação",
              requires_anchor_review: false,
            },
          ],
        });
      if (path.endsWith("/preview"))
        return Promise.resolve(
          preview("tipo", 7, { ...calculation, tipo_ato: "contestacao" }),
        );
      throw new Error(`unexpected ${path}`);
    });
    await render("type");
    await tick(10);
    await act(async () =>
      typeHook!.form.setValue("tipo_ato", "contestacao", {
        shouldValidate: true,
      }),
    );
    await tick();
    expect(mocks.fetch.mock.calls).toContainEqual([
      "/v1/prazos/preview",
      expect.objectContaining({
        body: {
          mode: "review",
          intimation_id: "intimation-1",
          expected_revision: 7,
          dimension: "tipo",
          tipo_ato: "contestacao",
        },
      }),
    ]);
    await vi.waitFor(() => expect(typeHook!.podeConfirmar).toBe(true));
  });

  it("declara ausência de prazo pelo fluxo Prazo com a revisão esperada", async () => {
    const invalidations = vi.spyOn(qc, "invalidateQueries");
    mocks.fetch.mockImplementation((path: string) => {
      if (path.endsWith("/no-deadline")) return Promise.resolve();
      if (path.endsWith("/preview")) return Promise.resolve(preview("prazo"));
      throw new Error(`unexpected ${path}`);
    });
    await render("deadline");
    expect(deadlineHook!.podeSemPrazo).toBe(true);
    await act(async () => deadlineHook!.onSemPrazo());
    await tick(10);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/v1/prazos/deadline-1/no-deadline",
      { method: "POST", body: { expected_revision: 7 } },
    );
    for (const queryKey of [
      ["prazos"],
      ["processos"],
      ["action-items"],
      ["preparation-actions"],
    ]) {
      expect(invalidations).toHaveBeenCalledWith({ queryKey });
    }
  });

  it("tipo novo usa catálogo e confirmação só de tipo, sem herdar 5 dias; prazo aceita dados atuais em ação separada", async () => {
    const invalidations = vi.spyOn(qc, "invalidateQueries");
    mocks.fetch.mockImplementation(
      (path: string, options?: { body?: Record<string, unknown> }) => {
        if (path.endsWith("/tipos"))
          return Promise.resolve({
            rules_version: "v1",
            rito: "comum_civel",
            items: [
              {
                key: "impugnacao_cumprimento",
                label: "Impugnação ao cumprimento",
                requires_anchor_review: false,
              },
            ],
          });
        if (path.endsWith("/preview"))
          return Promise.resolve(
            preview(
              options?.body?.dimension as "tipo" | "prazo",
              current.review_revision,
            ),
          );
        if (path.endsWith("/review"))
          return Promise.resolve({
            deadline: prazo({
              ...current,
              review_revision: current.review_revision + 1,
              tipo_ato: "impugnacao_cumprimento",
              review: {
                tipo: { ...pending, status: "confirmed" },
                prazo: pending,
              },
            }),
          });
        throw new Error(`unexpected ${path}`);
      },
    );
    await render("type");
    await tick(10);
    await act(async () =>
      typeHook!.form.setValue("tipo_ato", "impugnacao_cumprimento", {
        shouldValidate: true,
      }),
    );
    await tick();
    await tick(20);
    expect(typeHook!.podeConfirmar).toBe(true);
    const typePreviewCall = mocks.fetch.mock.calls.find(
      (call) => call[0] === "/v1/prazos/preview",
    );
    expect(typePreviewCall?.[1].body).toEqual({
      mode: "review",
      intimation_id: "intimation-1",
      expected_revision: 7,
      dimension: "tipo",
      tipo_ato: "impugnacao_cumprimento",
    });
    await act(async () => typeHook!.onConfirmar());
    await tick(10);
    const typeWrite = mocks.fetch.mock.calls.find(
      (call) => call[0] === "/v1/prazos/deadline-1/review",
    );
    expect(typeWrite?.[1].body).toEqual({
      expected_revision: 7,
      preview_token: "tipo-7",
      dimension: "tipo",
      tipo_ato: "impugnacao_cumprimento",
    });
    expect("deadline" in typeWrite![1].body).toBe(false);
    for (const queryKey of [
      ["prazos"],
      ["processos"],
      ["action-items"],
      ["preparation-actions"],
    ])
      expect(invalidations).toHaveBeenCalledWith({ queryKey });

    current = prazo({
      tipo_ato: "impugnacao_cumprimento",
      review_revision: 8,
      review: { tipo: { ...pending, status: "confirmed" }, prazo: pending },
    });
    await render("deadline");
    await tick();
    await tick(20);
    await act(async () =>
      deadlineHook!.form.setValue("revisado", true, { shouldValidate: true }),
    );
    await tick(10);
    expect(deadlineHook!.podeConfirmar).toBe(true);
    await act(async () => deadlineHook!.onSubmit());
    await tick(10);
    const writes = mocks.fetch.mock.calls.filter(
      (call) => call[0] === "/v1/prazos/deadline-1/review",
    );
    expect(writes[1][1].body).toEqual({
      expected_revision: 8,
      preview_token: "prazo-8",
      dimension: "prazo",
      deadline: undefined,
    });
  });

  it("prévia protegida permanece explícita e token velho não aplica após 409", async () => {
    let reviewCalls = 0;
    mocks.fetch.mockImplementation(
      (path: string, options?: { body?: Record<string, unknown> }) => {
        if (path.endsWith("/tipos"))
          return Promise.resolve({
            rules_version: "v1",
            rito: "comum_civel",
            items: [
              {
                key: "impugnacao_cumprimento",
                label: "Impugnação ao cumprimento",
                requires_anchor_review: false,
              },
            ],
          });
        if (path.endsWith("/preview"))
          return Promise.resolve(
            preview("tipo", 7, {
              ...calculation,
              protected: true,
              source: "declared",
              end_date: "2026-09-08",
            }),
          );
        if (path.endsWith("/review")) {
          reviewCalls++;
          return Promise.reject(
            new ApiError("CONFLICT", "stale", 409, { code: "REVIEW_STALE" }),
          );
        }
        throw new Error(`unexpected ${path} ${String(options?.body)}`);
      },
    );
    await render("type");
    await tick(10);
    await act(async () =>
      typeHook!.form.setValue("tipo_ato", "impugnacao_cumprimento", {
        shouldValidate: true,
      }),
    );
    await tick();
    await tick(20);
    expect(typeHook!.preview?.preserved_deadline).toBe(true);
    await act(async () => typeHook!.onConfirmar());
    await tick(10);
    expect(typeHook!.staleError).toBe(true);
    expect(typeHook!.podeConfirmar).toBe(false);
    await act(async () => typeHook!.onConfirmar());
    expect(reviewCalls).toBe(1);
  });

  it("resposta atrasada de outra escolha não libera token antigo", async () => {
    let resolveFirst!: (value: PrazoReviewPreviewResult) => void;
    const first = new Promise<PrazoReviewPreviewResult>((resolve) => {
      resolveFirst = resolve;
    });
    mocks.fetch.mockImplementation(
      (path: string, options?: { body?: Record<string, unknown> }) => {
        if (path.endsWith("/tipos"))
          return Promise.resolve({
            rules_version: "v1",
            rito: "comum_civel",
            items: [
              {
                key: "cumprimento_sentenca",
                label: "Cumprimento de sentença",
                requires_anchor_review: false,
              },
              {
                key: "impugnacao_cumprimento",
                label: "Impugnação ao cumprimento",
                requires_anchor_review: false,
              },
            ],
          });
        if (path.endsWith("/preview"))
          return options?.body?.tipo_ato === "cumprimento_sentenca"
            ? first
            : Promise.resolve(preview("tipo"));
        if (path.endsWith("/review"))
          return Promise.resolve({ deadline: prazo({ review_revision: 8 }) });
        throw new Error(`unexpected ${path}`);
      },
    );
    await render("type");
    await tick(350);
    expect(
      mocks.fetch.mock.calls.some(
        (call) =>
          call[0] === "/v1/prazos/preview" &&
          call[1].body.tipo_ato === "cumprimento_sentenca",
      ),
    ).toBe(true);
    await act(async () =>
      typeHook!.form.setValue("tipo_ato", "impugnacao_cumprimento", {
        shouldValidate: true,
      }),
    );
    expect(typeHook!.podeConfirmar).toBe(false);
    await tick();
    await tick(20);
    expect(typeHook!.preview?.preview_token).toBe("tipo-7");
    await act(async () =>
      resolveFirst({
        ...preview("tipo"),
        preview_token: "old-token",
        tipo_ato: "cumprimento_sentenca",
      }),
    );
    expect(typeHook!.preview?.preview_token).toBe("tipo-7");
    await act(async () => typeHook!.onConfirmar());
    await tick(10);
    const write = mocks.fetch.mock.calls.find(
      (call) => call[0] === "/v1/prazos/deadline-1/review",
    );
    expect(write?.[1].body).toMatchObject({
      tipo_ato: "impugnacao_cumprimento",
      preview_token: "tipo-7",
    });
  });

  it("aceita vencimento declarado protegido sem enviar ajuste ou recalcular os dias herdados", async () => {
    current = prazo({
      current_calculation: {
        ...calculation,
        source: "declared",
        protected: true,
        days: 5,
        end_date: "2026-09-08",
      },
      calculation_audit_status: "current",
    });
    mocks.fetch.mockImplementation(
      (path: string, options?: { body?: Record<string, unknown> }) => {
        if (path.endsWith("/preview"))
          return Promise.resolve(
            preview("prazo", 7, current.current_calculation!),
          );
        if (path.endsWith("/review"))
          return Promise.resolve({ deadline: prazo({ review_revision: 8 }) });
        throw new Error(`unexpected ${path} ${String(options?.body)}`);
      },
    );
    await render("deadline");
    await tick(20);
    expect(deadlineHook!.preview?.preserved_deadline).toBe(true);
    await act(async () =>
      deadlineHook!.form.setValue("revisado", true, { shouldValidate: true }),
    );
    await act(async () => deadlineHook!.onSubmit());
    await tick(10);
    const call = mocks.fetch.mock.calls.find(
      (item) => item[0] === "/v1/prazos/deadline-1/review",
    );
    expect(call?.[1].body).toEqual({
      expected_revision: 7,
      preview_token: "prazo-7",
      dimension: "prazo",
      deadline: undefined,
    });
  });
});
