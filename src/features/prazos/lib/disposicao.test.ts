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
  it("sem action_items → indeterminado (nunca ciência por omissão), vazia, sem item de ciência", () => {
    const d = derivarDisposicao([]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.headline).toBe("Trabalho a identificar");
    expect(d.vazia).toBe(true);
    expect(d.ciencia).toBeNull();
    expect(d.pecas).toHaveLength(0);
    expect(d.obrigacoes).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(0);
  });

  it("só item de ciência → ciência com item concluível, title/description preservados", () => {
    const d = derivarDisposicao([
      prov({
        id: "c1",
        tipo: "ciencia",
        gera_peca: false,
        status: "TODO",
        title: "Tomar ciência da juntada de mandado cumprido",
        description:
          "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos, podendo se manifestar sobre o ato.",
      }),
    ]);
    expect(d.tipo).toBe("ciencia");
    expect(d.headline).toBe("Ciência");
    expect(d.vazia).toBe(false);
    expect(d.ciencia).toEqual({
      actionItemId: "c1",
      title: "Tomar ciência da juntada de mandado cumprido",
      description:
        "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos, podendo se manifestar sobre o ato.",
      status: "TODO",
      concluida: false,
    });
    expect(d.obrigacoes).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(0);
  });

  it("item de ciência DONE → concluida=true", () => {
    const d = derivarDisposicao([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false, status: "DONE" }),
    ]);
    expect(d.ciencia?.concluida).toBe(true);
  });

  it("uma peça (tipo válido) → trabalho, headline fixo", () => {
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
    expect(d.headline).toBe("Trabalho a cumprir");
    expect(d.pecas).toHaveLength(1);
    expect(d.pecas[0]).toMatchObject({
      actionItemId: "p1",
      pieceProfileKey: "contestacao",
      jaIniciada: false,
    });
    expect(d.obrigacoes).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(0);
  });

  it("duas peças → ambas em `pecas`, WORKING marca jaIniciada", () => {
    const d = derivarDisposicao([
      prov({ id: "p1", gera_peca: true, status: "WORKING" }),
      prov({ id: "p2", gera_peca: true, status: "SUGGESTED" }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.pecas).toHaveLength(2);
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

  // Caso real 0b5a4b06-4131-4d74-89ec-b2527a7775ce: tipo='cumprir',
  // gera_peca=false — obrigação de fluxo curto, NUNCA "apenas ciência".
  it("cumprir sem gera_peca → trabalho, obrigação com title/description preservados, sem item de ciência", () => {
    const d = derivarDisposicao([
      prov({
        id: "01a0cf20-c9fd-7ccc-b84f-8da470df4462",
        tipo: "cumprir",
        gera_peca: false,
        piece_profile_key: null,
        title: "Indicar endereço da parte executada (art. 259, CPC)",
        description:
          "Apresentar o endereço correto da parte executada nos autos, conforme determinação judicial.",
        tipo_origem: "declarado",
        tipo_status: "confiavel",
        status: "SUGGESTED",
      }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.headline).toBe("Trabalho a cumprir");
    expect(d.ciencia).toBeNull();
    expect(d.pecas).toHaveLength(0);
    expect(d.obrigacoes).toHaveLength(1);
    expect(d.indeterminados).toHaveLength(0);
    expect(d.obrigacoes[0]).toMatchObject({
      actionItemId: "01a0cf20-c9fd-7ccc-b84f-8da470df4462",
      tipo: "cumprir",
      title: "Indicar endereço da parte executada (art. 259, CPC)",
      description:
        "Apresentar o endereço correto da parte executada nos autos, conforme determinação judicial.",
      geraPeca: false,
    });
  });

  it("mix peça + cumprir sem peça → trabalho com as duas obrigações, ciência não engole o cumprir", () => {
    const d = derivarDisposicao([
      prov({ id: "peca1", tipo: "contestar", gera_peca: true }),
      prov({ id: "cumprir1", tipo: "cumprir", gera_peca: false }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.pecas).toHaveLength(1);
    expect(d.obrigacoes).toHaveLength(1);
    expect(d.ciencia).toBeNull();
  });

  it("tipo desconhecido/vazio → indeterminado, nunca ciência nem 'cumprir' inventado, mas preserva title/description", () => {
    const d = derivarDisposicao([
      prov({
        id: "x1",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "xpto",
        gera_peca: false,
        title: "Ato não identificado",
        description: "Descrição bruta do ato.",
      }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.headline).toBe("Trabalho a identificar");
    expect(d.ciencia).toBeNull();
    expect(d.pecas).toHaveLength(0);
    expect(d.obrigacoes).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(1);
    expect(d.indeterminados[0]).toMatchObject({
      actionItemId: "x1",
      title: "Ato não identificado",
      description: "Descrição bruta do ato.",
    });
  });

  it("dados mistos: item de ciência real + item indeterminado → NUNCA retorna ciência", () => {
    const d = derivarDisposicao([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false }),
      prov({
        id: "x1",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "",
        gera_peca: false,
      }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.headline).toBe("Trabalho a identificar");
    // O item de ciência real continua exposto para quem quiser concluí-lo,
    // mas a disposição GERAL não pode ser "ciencia" com dado incerto ao lado.
    expect(d.ciencia?.actionItemId).toBe("c1");
    expect(d.indeterminados).toHaveLength(1);
  });

  it("contraditório (tipo=ciencia + gera_peca=true) → indeterminado, NÃO inventa obrigação/peça, nunca falsa ciência", () => {
    const d = derivarDisposicao([
      prov({
        id: "contra1",
        tipo: "ciencia",
        gera_peca: true,
        piece_profile_key: "contestacao",
      }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.ciencia).toBeNull();
    expect(d.pecas).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(1);
    expect(d.indeterminados[0].actionItemId).toBe("contra1");
  });

  it("tipo desconhecido + gera_peca=true → indeterminado (gera_peca não prova obrigação sozinho)", () => {
    const d = derivarDisposicao([
      prov({
        id: "unknowntrue1",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "xpto",
        gera_peca: true,
        piece_profile_key: "manifestacao",
      }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.pecas).toHaveLength(0);
    expect(d.obrigacoes).toHaveLength(0);
    expect(d.indeterminados).toHaveLength(1);
    expect(d.indeterminados[0].actionItemId).toBe("unknowntrue1");
  });

  it("tipo=ciencia + gera_peca=true (sciencetrue) → indeterminado, ciência não é engolida por gera_peca", () => {
    const d = derivarDisposicao([
      prov({ id: "sciencetrue1", tipo: "ciencia", gera_peca: true }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.ciencia).toBeNull();
    expect(d.indeterminados).toHaveLength(1);
  });

  it("válido + desconhecido misturados → trabalho, mas os DOIS aparecem (obrigacoes e indeterminados populados)", () => {
    const d = derivarDisposicao([
      prov({ id: "valido1", tipo: "cumprir", gera_peca: false }),
      prov({
        id: "unknown1",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "xpto",
        gera_peca: false,
      }),
    ]);
    expect(d.tipo).toBe("trabalho");
    expect(d.obrigacoes).toHaveLength(1);
    expect(d.obrigacoes[0].actionItemId).toBe("valido1");
    expect(d.indeterminados).toHaveLength(1);
    expect(d.indeterminados[0].actionItemId).toBe("unknown1");
  });

  it("ciência real + desconhecido (sciencia+unknown) → indeterminado, ciência exposta mas não vence", () => {
    const d = derivarDisposicao([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false }),
      prov({
        id: "unknown2",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "xpto",
        gera_peca: false,
      }),
    ]);
    expect(d.tipo).toBe("indeterminado");
    expect(d.ciencia?.actionItemId).toBe("c1");
    expect(d.indeterminados).toHaveLength(1);
    expect(d.indeterminados[0].actionItemId).toBe("unknown2");
  });

  // Oportunidade (docs/obrigacao-first-architecture.md v3 — PM: "Recurso/apelação
  // = Oportunidade", nunca "dever de recorrer"). `oportunidades` é um RECORTE
  // aditivo/não-exclusivo de pecas∪obrigacoes — recorrer NUNCA sai delas (índice
  // "meio" de Gerar peça que intimacao-detalhe.tsx consome, preservado).
  describe("oportunidades (tipo=recorrer) — recorte aditivo, nunca ciência/indeterminado", () => {
    it("recorrer com gera_peca=true → trabalho; item aparece em `pecas` E em `oportunidades` (mesma identidade)", () => {
      const d = derivarDisposicao([
        prov({
          id: "rec1",
          tipo: "recorrer",
          gera_peca: true,
          piece_profile_key: "apelacao",
          title: "Avaliar cabimento de apelação",
        }),
      ]);
      expect(d.tipo).toBe("trabalho");
      expect(d.pecas).toHaveLength(1);
      expect(d.pecas[0].actionItemId).toBe("rec1");
      expect(d.oportunidades).toHaveLength(1);
      expect(d.oportunidades[0]).toEqual(d.pecas[0]);
      expect(d.obrigacoes).toHaveLength(0);
      expect(d.indeterminados).toHaveLength(0);
      expect(d.ciencia).toBeNull();
    });

    it("recorrer com gera_peca=false → item aparece em `obrigacoes` E em `oportunidades`", () => {
      const d = derivarDisposicao([
        prov({ id: "rec2", tipo: "recorrer", gera_peca: false }),
      ]);
      expect(d.obrigacoes).toHaveLength(1);
      expect(d.oportunidades).toHaveLength(1);
      expect(d.oportunidades[0]).toEqual(d.obrigacoes[0]);
      expect(d.pecas).toHaveLength(0);
    });

    // Headline (o TEXTO, não só `tipo`) nunca afirma "a cumprir" (dever) numa
    // oportunidade isolada — `tipo` PERMANECE "trabalho" (canonical, CTA
    // target de intimacao-detalhe.tsx inalterado); só o headline muda.
    it("oportunidade ISOLADA (só recorrer, nada mais) → tipo='trabalho' (canonical, inalterado) mas headline factual, NUNCA 'a cumprir'", () => {
      const d = derivarDisposicao([
        prov({ id: "rec1", tipo: "recorrer", gera_peca: true }),
      ]);
      expect(d.tipo).toBe("trabalho");
      expect(d.headline).toBe("Oportunidade identificada");
      expect(d.headline).not.toContain("a cumprir");
    });

    it("oportunidade + indeterminado (sem obrigação real) → headline 'Trabalho a identificar' (reflete o item incerto, não a oportunidade)", () => {
      const d = derivarDisposicao([
        prov({ id: "rec1", tipo: "recorrer", gera_peca: true }),
        prov({
          id: "unk1",
          // @ts-expect-error — runtime pode divergir do enum fechado do FE.
          tipo: "xpto",
          gera_peca: false,
        }),
      ]);
      expect(d.tipo).toBe("trabalho");
      expect(d.headline).toBe("Trabalho a identificar");
      expect(d.indeterminados).toHaveLength(1);
      expect(d.oportunidades).toHaveLength(1);
    });

    it("oportunidade + obrigação real → headline 'Trabalho a cumprir' (a obrigação real justifica o dever, a oportunidade continua rotulada à parte)", () => {
      const d = derivarDisposicao([
        prov({ id: "rec1", tipo: "recorrer", gera_peca: true }),
        prov({ id: "obrig1", tipo: "cumprir", gera_peca: false }),
      ]);
      expect(d.headline).toBe("Trabalho a cumprir");
      expect(d.oportunidades).toHaveLength(1);
      expect(d.obrigacoes).toHaveLength(1);
    });

    it("misto: obrigação real + oportunidade + indeterminado → as TRÊS classes aparecem, nenhuma esconde a outra", () => {
      const d = derivarDisposicao([
        prov({ id: "obrig1", tipo: "cumprir", gera_peca: false }),
        prov({ id: "rec1", tipo: "recorrer", gera_peca: true }),
        prov({
          id: "unk1",
          // @ts-expect-error — runtime pode divergir do enum fechado do FE.
          tipo: "xpto",
          gera_peca: false,
        }),
      ]);
      expect(d.tipo).toBe("trabalho");
      expect(d.obrigacoes.map((o) => o.actionItemId)).toEqual(["obrig1"]);
      expect(d.oportunidades.map((o) => o.actionItemId)).toEqual(["rec1"]);
      expect(d.indeterminados.map((o) => o.actionItemId)).toEqual(["unk1"]);
    });

    it("sem itens recorrer → `oportunidades` vazio", () => {
      const d = derivarDisposicao([
        prov({ id: "obrig1", tipo: "cumprir", gera_peca: false }),
      ]);
      expect(d.oportunidades).toHaveLength(0);
    });
  });

  // GAP 2 (fulfillment): reusa o JSON já tipado/persistido do action_item — sem
  // campo novo/duplicado. `toObrigacao` propaga `fulfillment` (null quando
  // ausente/legado) pra pecas/obrigacoes/oportunidades/indeterminados.
  describe("fulfillment propagado (reuso do JSON já persistido, sem campo novo)", () => {
    const fulfillment = {
      status: "possible_fulfillment" as const,
      reason: "Resposta localizada pode atender parte da obrigação.",
      obligation_quote: "Comprovar o pagamento no prazo de 15 dias.",
      evidence: [],
      sources: {
        source_revision: "rev-1",
        scope: "post_intimation_and_undated" as const,
        coverage: "usable" as const,
        reason: "",
        checked_at: "2026-09-23T00:00:00Z",
        stale: false,
      },
      invalidated: false,
    };

    it("item com fulfillment → propagado literal (mesmo objeto/campos, sem duplicar quote)", () => {
      const d = derivarDisposicao([
        prov({ id: "cump1", tipo: "cumprir", gera_peca: false, fulfillment }),
      ]);
      expect(d.obrigacoes[0].fulfillment).toEqual(fulfillment);
      expect(d.obrigacoes[0].fulfillment?.obligation_quote).toBe(
        "Comprovar o pagamento no prazo de 15 dias.",
      );
    });

    it("item legado sem fulfillment → null (nunca inventa quote/estrutura)", () => {
      const d = derivarDisposicao([
        prov({ id: "cump2", tipo: "cumprir", gera_peca: false }),
      ]);
      expect(d.obrigacoes[0].fulfillment).toBeNull();
    });
  });
});
