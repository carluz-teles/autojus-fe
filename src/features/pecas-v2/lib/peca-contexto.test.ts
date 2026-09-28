import { describe, expect, it } from "vitest";

import type { Draft, DraftPartyGroup } from "../types";
import { draftToPecaContexto, poloDoCliente } from "./peca-contexto";

const parte = (extra: Partial<DraftPartyGroup> = {}): DraftPartyGroup => ({
  roleLabel: "Autor",
  name: "EMPRESA EXEMPLO LTDA",
  counselLabel: "",
  isClient: false,
  ...extra,
});

const draft = (extra: Partial<Draft> = {}) =>
  ({
    id: "d1",
    process: {
      courtRecordId: "cr1",
      cnj: "4012732-71.2026.8.26.0506",
      classe: "Execução de título extrajudicial",
      assunto: "",
      orgao: "Vara do Juizado Especial Cível da Comarca de Franca",
      tribunalGrau: "TJSP · Grau não informado",
      valor: "",
      distribuicao: "",
    },
    intimation: { id: "i1", title: "Intimação", publishedAt: "", teor: "" },
    deadline: { endDate: "30/09/2026", daysLeft: 2 },
    partyGroups: [],
    parties: [],
    processDocuments: [],
    attachments: [],
    ...extra,
  }) as unknown as Draft;

// ITEM 1 — `is_client` (derivado no BE de court_case.client_role: a parte cujo
// advogado carrega a OAB vigiada) JÁ chega no payload de GET /v1/pecas/:id e o
// rail do Resumo o descartava. O polo do cliente é a informação que diz de que
// lado o escritório está — nunca inventada quando o dado não existe.
describe("poloDoCliente — qual polo é o cliente do escritório", () => {
  it("devolve o polo da parte marcada como cliente", () => {
    expect(
      poloDoCliente([
        parte({ roleLabel: "Autor" }),
        parte({ roleLabel: "Réu", name: "FULANO", isClient: true }),
      ]),
    ).toBe("Réu");
  });

  it("devolve vazio quando NENHUMA parte é o cliente — nunca chuta um polo", () => {
    expect(poloDoCliente([parte(), parte({ roleLabel: "Réu" })])).toBe("");
  });

  it("devolve vazio na lista vazia de partes", () => {
    expect(poloDoCliente([])).toBe("");
  });

  it("ignora parte marcada como cliente sem rótulo de polo", () => {
    expect(poloDoCliente([parte({ roleLabel: "", isClient: true })])).toBe("");
  });
});

describe("draftToPecaContexto — contexto do rail", () => {
  it("propaga o polo do cliente e a marca isClient de cada parte", () => {
    const ctx = draftToPecaContexto(
      draft({
        partyGroups: [
          parte({ roleLabel: "Autor" }),
          parte({ roleLabel: "Réu", name: "FULANO", isClient: true }),
        ],
      }),
    );
    expect(ctx.processo.clientePolo).toBe("Réu");
    expect(ctx.partes.map((p) => p.isClient)).toEqual([false, true]);
  });

  it("clientePolo fica vazio quando o BE não marcou nenhuma parte", () => {
    expect(
      draftToPecaContexto(draft({ partyGroups: [parte()] })).processo
        .clientePolo,
    ).toBe("");
  });
});
