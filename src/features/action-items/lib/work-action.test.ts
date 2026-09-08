import { describe, expect, it } from "vitest";

import type { ActionItemView } from "../types";
import { primaryWorkAction } from "./work-action";

function item(overrides: Partial<ActionItemView> = {}): ActionItemView {
  return {
    id: "providencia-1",
    intimation_id: "intimacao-1",
    title: "Apresentar contestação",
    tipo: "contestar",
    gera_peca: true,
    piece_profile_key: "contestacao",
    tipo_origem: "manual",
    tipo_status: "confiavel",
    status: "TODO",
    due_date: null,
    completed_at: null,
    created_at: "2026-09-08T12:00:00Z",
    updated_at: "2026-09-08T12:00:00Z",
    ...overrides,
  };
}

describe("primaryWorkAction", () => {
  it("oferece gerar peça para providência ativa, confirmada e ligada à intimação", () => {
    expect(primaryWorkAction(item())).toBe("generate-piece");
  });

  it("pede revisão quando a providência gera peça mas o tipo não foi confirmado", () => {
    expect(primaryWorkAction(item({ tipo_status: "a_confirmar" }))).toBe(
      "review-type",
    );
  });

  it("mantém a peça existente acessível mesmo sem intimação ou em estado terminal", () => {
    expect(
      primaryWorkAction(
        item({ intimation_id: "", status: "DONE", draft_id: "peca-1" }),
      ),
    ).toBe("open-piece");
  });

  it("não oferece geração sem intimação de origem", () => {
    expect(primaryWorkAction(item({ intimation_id: "" }))).toBe("start-work");
  });
});
