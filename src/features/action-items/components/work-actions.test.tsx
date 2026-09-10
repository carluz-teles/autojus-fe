import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ActionItemView, ProvidenciaFulfillment } from "../types";

vi.mock("../hooks/use-workspace", () => ({
  useWorkMutation: () => ({
    isPending: false,
    isError: false,
    mutate: vi.fn(),
  }),
}));

import { WorkActions } from "./work-actions";

function item(overrides: Partial<ActionItemView> = {}): ActionItemView {
  return {
    id: "suggestion-1",
    intimation_id: "intimation-1",
    title: "Comprovar pagamento",
    tipo: "cumprir",
    gera_peca: false,
    tipo_origem: "ia",
    tipo_status: "confiavel",
    status: "SUGGESTED",
    due_date: null,
    completed_at: null,
    created_at: "2026-09-09T12:00:00Z",
    updated_at: "2026-09-09T12:00:00Z",
    fulfillment: actionableFulfillment,
    ...overrides,
  };
}

const actionableFulfillment: ProvidenciaFulfillment = {
  status: "possible_fulfillment",
  reason: "Resposta encontrada.",
  obligation_quote: "Comprovar pagamento.",
  evidence: [
    {
      document_id: "doc-1",
      title: "Petição",
      date: "2026-09-08",
      page: 1,
      quote: "Pagamento comprovado.",
    },
  ],
  sources: {
    source_revision: "rev-1",
    scope: "post_intimation_and_undated",
    coverage: "usable",
    reason: "Autos consultados.",
    checked_at: "2026-09-09T12:00:00Z",
    stale: false,
  },
  invalidated: false,
};

const negativeFulfillments: Array<[string, ActionItemView["fulfillment"]]> = [
  ["sem finding", undefined],
  [
    "stale",
    {
      ...actionableFulfillment,
      sources: { ...actionableFulfillment.sources, stale: true },
    },
  ],
  ["invalidado", { ...actionableFulfillment, invalidated: true }],
  ["sem evidência", { ...actionableFulfillment, evidence: [] }],
];

describe("WorkActions para sugestões", () => {
  it("oferece criar já concluída diretamente em SUGGESTED", () => {
    const html = renderToStaticMarkup(
      createElement(WorkActions, { item: item() }),
    );
    expect(html).toContain("Criar já concluída");
    expect(html).toContain("Revisar e adicionar");
  });

  it("não oferece accept_completed enquanto o gate de tipo está pendente", () => {
    const html = renderToStaticMarkup(
      createElement(WorkActions, {
        item: item({ tipo_status: "a_confirmar" }),
      }),
    );
    expect(html).not.toContain("Criar já concluída");
  });

  it.each(negativeFulfillments)(
    "não oferece accept_completed quando está %s",
    (_label, fulfillment) => {
      const html = renderToStaticMarkup(
        createElement(WorkActions, { item: item({ fulfillment }) }),
      );
      expect(html).not.toContain("Criar já concluída");
    },
  );
});
