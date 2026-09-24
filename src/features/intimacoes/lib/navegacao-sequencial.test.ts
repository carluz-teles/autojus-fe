import { describe, expect, it } from "vitest";

import { vizinhosNaLista } from "./navegacao-sequencial";

const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("vizinhosNaLista", () => {
  it("sem seleção (id nulo), não há anterior nem próxima", () => {
    expect(vizinhosNaLista(rows, null)).toEqual({
      anterior: null,
      proxima: null,
    });
  });

  it("primeiro item: sem anterior, com próxima", () => {
    expect(vizinhosNaLista(rows, "a")).toEqual({
      anterior: null,
      proxima: { id: "b" },
    });
  });

  it("item do meio: anterior e próxima", () => {
    expect(vizinhosNaLista(rows, "b")).toEqual({
      anterior: { id: "a" },
      proxima: { id: "c" },
    });
  });

  it("último item: com anterior, sem próxima", () => {
    expect(vizinhosNaLista(rows, "c")).toEqual({
      anterior: { id: "b" },
      proxima: null,
    });
  });

  it("id fora da lista (recorte mudou): sem anterior nem próxima", () => {
    expect(vizinhosNaLista(rows, "fora-do-recorte")).toEqual({
      anterior: null,
      proxima: null,
    });
  });
});
