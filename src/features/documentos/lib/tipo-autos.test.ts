import { describe, expect, it } from "vitest";

import { identificarAuto, rotuloTipoAuto } from "./tipo-autos";

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

  it("tipo desconhecido/vazio cai no fallback defensivo (nunca vazio) — comportamento preservado", () => {
    expect(rotuloTipoAuto("")).toBe("Documento");
    expect(rotuloTipoAuto("CODIGO_NOVO")).toBe("Codigo_novo");
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
