import { describe, expect, it } from "vitest";

import type { IntimacaoProvidencia } from "@/features/intimacoes/types";

import { derivarDisposicao } from "./disposicao";

function prov(over: Partial<IntimacaoProvidencia>): IntimacaoProvidencia {
  return {
    id: "ai-1",
    title: "Providência",
    description: null,
    tipo: "manifestar",
    gera_peca: false,
    piece_profile_key: null,
    tipo_origem: "ia",
    tipo_status: "confiavel",
    confianca: null,
    status: "SUGGESTED",
    deadline_id: null,
    ...over,
  };
}

describe("derivarDisposicao", () => {
  it("sem action_items → apenas ciência, vazia, sem item de ciência", () => {
    const d = derivarDisposicao([]);
    expect(d.tipo).toBe("ciencia");
    expect(d.headline).toBe("Apenas ciência");
    expect(d.vazia).toBe(true);
    expect(d.ciencia).toBeNull();
    expect(d.pecas).toHaveLength(0);
  });

  it("só item de ciência → apenas ciência com item concluível", () => {
    const d = derivarDisposicao([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false, status: "TODO" }),
    ]);
    expect(d.tipo).toBe("ciencia");
    expect(d.vazia).toBe(false);
    expect(d.ciencia).toEqual({
      actionItemId: "c1",
      status: "TODO",
      concluida: false,
    });
  });

  it("item de ciência DONE → concluida=true", () => {
    const d = derivarDisposicao([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false, status: "DONE" }),
    ]);
    expect(d.ciencia?.concluida).toBe(true);
  });

  it("uma peça → precisa de trabalho, 1 peça", () => {
    const d = derivarDisposicao([
      prov({
        id: "p1",
        tipo: "contestar",
        gera_peca: true,
        piece_profile_key: "contestacao",
        status: "TODO",
      }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.headline).toBe("Precisa de trabalho — 1 peça");
    expect(d.pecas).toHaveLength(1);
    expect(d.pecas[0]).toMatchObject({
      actionItemId: "p1",
      pieceProfileKey: "contestacao",
      jaIniciada: false,
    });
  });

  it("duas peças → plural, WORKING marca jaIniciada", () => {
    const d = derivarDisposicao([
      prov({ id: "p1", gera_peca: true, status: "WORKING" }),
      prov({ id: "p2", gera_peca: true, status: "SUGGESTED" }),
    ]);
    expect(d.headline).toBe("Precisa de trabalho — 2 peças");
    expect(d.pecas[0].jaIniciada).toBe(true);
    expect(d.pecas[1].jaIniciada).toBe(false);
  });

  it("peças + ciência convivem: trabalho mantém o item de ciência", () => {
    const d = derivarDisposicao([
      prov({ id: "p1", gera_peca: true, status: "TODO" }),
      prov({ id: "c1", tipo: "ciencia", gera_peca: false, status: "TODO" }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.pecas).toHaveLength(1);
    expect(d.ciencia?.actionItemId).toBe("c1");
  });
});
