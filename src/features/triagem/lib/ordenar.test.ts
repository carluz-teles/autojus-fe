import { describe, expect, it } from "vitest";

import type {
  IntimacaoPrazoView,
  IntimacaoView,
} from "@/features/intimacoes/types";

import { ordenarPorUrgencia } from "./ordenar";

function prazo(days_left: number, confirmed = false): IntimacaoPrazoView {
  return {
    deadline_id: `deadline-${days_left}`,
    end_date: "2026-09-10",
    days_left,
    status: "PENDING",
    confirmed,
  };
}

function item(
  id: string,
  overrides: Partial<Pick<IntimacaoView, "prazo" | "made_available_at">> = {},
): IntimacaoView {
  return {
    id,
    cnj_number: `0000000-00.2026.8.26.${id}`,
    class: "",
    subject: "",
    court_record_id: `cr-${id}`,
    court: "TJSP",
    degree: "G1",
    type: "INTIMACAO",
    status: "ACTIVE",
    user_status: "PENDING",
    source: "DJEN",
    source_url: "",
    made_available_at: "2026-09-01T00:00:00Z",
    published_at: "2026-09-01T00:00:00Z",
    deadline_start_at: "2026-09-01T00:00:00Z",
    content_preview: "",
    prazo: null,
    ai_analyzed_at: null,
    assignee_user_id: null,
    assignee_user_name: null,
    work_stage: "RECEIVED",
    ...overrides,
  };
}

describe("ordenarPorUrgencia", () => {
  it("ordena por days_left ascendente (mais urgente primeiro)", () => {
    const itens = [
      item("a", { prazo: prazo(5) }),
      item("b", { prazo: prazo(-2) }),
      item("c", { prazo: prazo(0) }),
    ];

    const resultado = ordenarPorUrgencia(itens);

    expect(resultado.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("coloca itens sem prazo por último, independente da posição original", () => {
    const itens = [
      item("sem-prazo", { prazo: null }),
      item("com-prazo", { prazo: prazo(3) }),
    ];

    const resultado = ordenarPorUrgencia(itens);

    expect(resultado.map((i) => i.id)).toEqual(["com-prazo", "sem-prazo"]);
  });

  it("empata em days_left e desempata por made_available_at DESC (mais recente primeiro)", () => {
    const itens = [
      item("mais-antiga", {
        prazo: prazo(1),
        made_available_at: "2026-08-01T00:00:00Z",
      }),
      item("mais-recente", {
        prazo: prazo(1),
        made_available_at: "2026-09-01T00:00:00Z",
      }),
    ];

    const resultado = ordenarPorUrgencia(itens);

    expect(resultado.map((i) => i.id)).toEqual(["mais-recente", "mais-antiga"]);
  });

  it("desempata itens sem prazo por made_available_at DESC", () => {
    const itens = [
      item("sem-prazo-antiga", {
        prazo: null,
        made_available_at: "2026-08-01T00:00:00Z",
      }),
      item("sem-prazo-recente", {
        prazo: null,
        made_available_at: "2026-09-01T00:00:00Z",
      }),
    ];

    const resultado = ordenarPorUrgencia(itens);

    expect(resultado.map((i) => i.id)).toEqual([
      "sem-prazo-recente",
      "sem-prazo-antiga",
    ]);
  });

  it("não muta o array de entrada", () => {
    const itens = [
      item("a", { prazo: prazo(5) }),
      item("b", { prazo: prazo(-2) }),
    ];
    const copiaOriginal = [...itens];

    ordenarPorUrgencia(itens);

    expect(itens).toEqual(copiaOriginal);
  });
});
