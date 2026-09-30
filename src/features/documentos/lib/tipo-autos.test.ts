import { describe, expect, it } from "vitest";

import {
  formatarReferenciaAuto,
  identificarAuto,
  rotuloTipoAuto,
} from "./tipo-autos";

describe("formatarReferenciaAuto", () => {
  const esaj = {
    source_system: "ESAJ",
    reference_kind: "DOCUMENT",
    document_code: "CD999",
    logical_doc_ref: "CD999",
    unit_index: 2,
    folio_start: 4,
    folio_end: 5,
  } as const;

  it("shows official process folios only after verification", () => {
    expect(
      formatarReferenciaAuto({
        ...esaj,
        numbering_scope: "PROCESS",
        folio_verified: true,
      }),
    ).toBe("Documento CD999, fls. 4–5");
    expect(
      formatarReferenciaAuto({
        ...esaj,
        numbering_scope: "PROCESS",
        folio_verified: false,
      }),
    ).toBe("Documento CD999, unidade 2, página 1 do PDF");
  });

  it("labels restricted document folios as local pagination", () => {
    expect(
      formatarReferenciaAuto({
        ...esaj,
        numbering_scope: "DOCUMENT",
        folio_verified: true,
      }),
    ).toBe("Documento CD999, páginas locais 4–5");
    expect(formatarReferenciaAuto({ ...esaj, folio_verified: true })).toBe(
      "Documento CD999, unidade 2, página 1 do PDF",
    );
  });

  it("preserves the EPROC event and document number", () => {
    expect(
      formatarReferenciaAuto({ event_number: 42, document_code: "DOC60" }),
    ).toBe("Evento 42, documento DOC60");
  });
});

// A4 (docs/qa-remediation-evidence/fe-operations-architecture.md): documentos do
// MESMO tipo (ex.: 3 "Petição") precisam ser distinguíveis — nome descritivo
// (tipo, já existente) + data de captura (dado real do DTO) na meta.
describe("identificarAuto", () => {
  it("nome vem do tipo (rotuloTipoAuto), nunca o código cru/título genérico", () => {
    const { nome } = identificarAuto({
      document_type: "SENT",
      title: "documento_scan_0912.pdf",
      created_at: "2026-03-12T10:00:00Z",
      origin: "COURT",
    });
    expect(nome).toBe("Sentença");
    expect(nome).not.toContain("documento_scan");
  });

  it("meta inclui a data de captura formatada (desambigua autos do mesmo tipo)", () => {
    const a = identificarAuto({
      document_type: "PET",
      title: "peticao_1.pdf",
      created_at: "2026-03-12T10:00:00Z",
      origin: "COURT",
    });
    const b = identificarAuto({
      document_type: "PET",
      title: "peticao_2.pdf",
      created_at: "2026-05-20T10:00:00Z",
      origin: "COURT",
    });
    expect(a.nome).toBe(b.nome); // mesmo tipo, nomes iguais
    expect(a.meta).toContain("12/03/2026");
    expect(b.meta).toContain("20/05/2026");
    expect(a.meta).not.toBe(b.meta); // a META desambigua, não o nome
  });

  it("meta preserva título bruto, páginas e origem (nada removido, só a data ADICIONADA)", () => {
    const { meta } = identificarAuto({
      document_type: "CONT",
      title: "contestacao_final.pdf",
      created_at: "2026-01-05T00:00:00Z",
      pages: 12,
      origin: "COURT",
    });
    expect(meta).toContain("05/01/2026");
    expect(meta).toContain("contestacao_final.pdf");
    expect(meta).toContain("12 pág.");
    expect(meta).toContain("Autos");
  });

  it("origin=UPLOAD mostra 'Anexo do escritório' (comportamento preservado)", () => {
    const { meta } = identificarAuto({
      document_type: "DOC",
      title: "anexo.pdf",
      created_at: "2026-01-05T00:00:00Z",
      origin: "UPLOAD",
    });
    expect(meta).toContain("Anexo do escritório");
    expect(meta).not.toContain("Autos");
  });

  it("sem created_at (dado ausente/legado) não injeta data vazia/inválida na meta", () => {
    const { meta } = identificarAuto({
      document_type: "PET",
      title: "peticao.pdf",
      created_at: "",
      origin: "COURT",
    });
    expect(meta).toBe("peticao.pdf · Autos");
  });

  // MUDANÇA DELIBERADA: o fallback era um title-case do código ("CODIGO_NOVO" →
  // "Codigo_novo"), que fabricava palavra pt-BR errada em códigos reais do eproc
  // ("SENTENCA" → "Sentenca", sem cedilha). Agora o código desconhecido aparece como
  // código. O que segue garantido: nunca vazio.
  it("tipo desconhecido/vazio cai no fallback defensivo (nunca vazio)", () => {
    expect(rotuloTipoAuto("")).toBe("Documento");
    expect(rotuloTipoAuto("CODIGO_NOVO")).toBe("CODIGO_NOVO");
  });

  // A4 — data JURÍDICA (court_event_date) agora projetada no DocumentView.
  it("usa a data JURÍDICA (court_event_date) quando presente, SEM rótulo de captura", () => {
    const { meta } = identificarAuto({
      document_type: "SENT",
      title: "sentenca.pdf",
      created_at: "2026-05-20T10:00:00Z", // captura (posterior)
      court_event_date: "2026-05-17T00:00:00Z", // ato (real)
      origin: "COURT",
    });
    expect(meta).toContain("17/05/2026"); // a data do ato
    expect(meta).not.toContain("20/05/2026"); // não a de captura
    expect(meta).not.toContain("Capturado em"); // data real → sem rótulo de fallback
  });

  it("fallback de captura é VISIVELMENTE rotulado quando não há data jurídica", () => {
    const { meta } = identificarAuto({
      document_type: "PET",
      title: "peticao.pdf",
      created_at: "2026-05-20T10:00:00Z",
      court_event_date: null,
      origin: "COURT",
    });
    expect(meta).toContain("Capturado em 20/05/2026");
  });

  it("dois autos capturados juntos (mesmo created_at) mas com datas jurídicas distintas ficam distinguíveis", () => {
    const base = {
      document_type: "PET" as const,
      title: "peticao.pdf",
      created_at: "2026-05-20T10:00:00Z", // MESMA leva de captura
      origin: "COURT" as const,
    };
    const a = identificarAuto({
      ...base,
      court_event_date: "2026-05-10T00:00:00Z",
    });
    const b = identificarAuto({
      ...base,
      court_event_date: "2026-05-15T00:00:00Z",
    });
    expect(a.nome).toBe(b.nome); // mesmo tipo
    expect(a.meta).not.toBe(b.meta); // desambiguados pela data do ato, não pela captura
    expect(a.meta).toContain("10/05/2026");
    expect(b.meta).toContain("15/05/2026");
  });
});

// O title-case defensivo fabricava palavra pt-BR ERRADA: um código não mapeado como
// "SENTENCA" saía "Sentenca" — sem cedilha, com cara de typo NOSSO. Código que não
// conhecemos é mostrado como código (é o rótulo do tribunal), nunca como pseudo-palavra.
describe("rotuloTipoAuto — código desconhecido", () => {
  it("não inventa palavra pt-BR sem acento para código não mapeado", () => {
    expect(rotuloTipoAuto("SENTENCA")).toBe("SENTENCA");
    expect(rotuloTipoAuto("SENTENCA")).not.toBe("Sentenca");
    expect(rotuloTipoAuto("DESPACHO_INICIAL")).toBe("DESPACHO_INICIAL");
  });

  it("segue traduzindo os códigos conhecidos e nunca devolve vazio", () => {
    expect(rotuloTipoAuto("SENT")).toBe("Sentença");
    expect(rotuloTipoAuto("sent")).toBe("Sentença");
    expect(rotuloTipoAuto("  ")).toBe("Documento");
    expect(rotuloTipoAuto("")).toBe("Documento");
  });
});

it("normalizes descriptive portal types without inventing a classification", () => {
  expect(rotuloTipoAuto("PLANILHA DE CÁLCULO")).toBe("Planilha de cálculo");
  expect(rotuloTipoAuto("IMPUGNAÇÃO")).toBe("Impugnação");
  expect(rotuloTipoAuto("OUTROS")).toBe("Outros");
});
