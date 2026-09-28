import { describe, expect, it } from "vitest";

import { mapPecaDetailToDraft } from "./api-mapper";
import type { PecaDetailAPI } from "./api-types";

const detail = (process: Partial<PecaDetailAPI["process"]>) =>
  ({
    id: "d1",
    piece_type: "MOTION",
    title: "Petição",
    status: "DRAFT",
    saga_state: "READY",
    content_revision: 1,
    process: {
      case_id: "c1",
      court_record_id: "cr1",
      cnj_number: "40127327120268260506",
      court: "TJSP",
      degree: "UNKNOWN",
      class: "Execução",
      subject: "",
      judging_body: "Vara do Juizado Especial Cível da Comarca de Franca",
      ...process,
    },
    parties: [],
    documents: [],
    attachments: [],
  }) as unknown as PecaDetailAPI;

// ITEM 3 — `court_record.degree` guarda o sentinela LITERAL 'UNKNOWN'. O resto
// do FE já o traduz por `grauProcessoLabel`; este mapper interpolava o enum cru
// e a bancada imprimia "… · TJSP · UNKNOWN" na cara do advogado. Enum cru na UI
// é sempre defeito — a tradução é a fonte única (processos/lib/apresentacao).
describe("mapPecaDetailToDraft — grau do processo nunca vaza enum cru", () => {
  it("traduz o sentinela UNKNOWN em vez de imprimi-lo", () => {
    const { process } = mapPecaDetailToDraft(detail({ degree: "UNKNOWN" }));
    expect(process.tribunalGrau).toBe("TJSP · Grau não informado");
    expect(process.tribunalGrau).not.toContain("UNKNOWN");
  });

  it("traduz os graus conhecidos para o rótulo pt-BR", () => {
    expect(
      mapPecaDetailToDraft(detail({ degree: "JE" })).process.tribunalGrau,
    ).toBe("TJSP · Juizado");
    expect(
      mapPecaDetailToDraft(detail({ degree: "G2" })).process.tribunalGrau,
    ).toBe("TJSP · 2º grau");
  });

  it("grau desconhecido fora do CHECK também não vaza cru", () => {
    expect(
      mapPecaDetailToDraft(detail({ degree: "ALGO_NOVO" })).process
        .tribunalGrau,
    ).toBe("TJSP · Grau não informado");
  });

  it("omite o separador quando o tribunal vem vazio", () => {
    expect(
      mapPecaDetailToDraft(detail({ court: "", degree: "G1" })).process
        .tribunalGrau,
    ).toBe("1º grau");
  });
});
