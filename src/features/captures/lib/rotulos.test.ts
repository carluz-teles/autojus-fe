import { expect, it } from "vitest";

import { captureKindLabel, captureSourceLabel, KIND_LABEL } from "./rotulos";

// O BE ganhou o kind MANUAL_IMPORT (migration 0155 + a UNION de
// internal/acquisition/queries/captures.sql) e a lista de Capturas imprimia o enum
// CRU — "MANUAL_IMPORT" na cara do usuário. O conjunto fechado é o do BE:
// DAILY_CAPTURE, ENRICHMENT, MANUAL_IMPORT, INITIAL_LOAD e CATCH_UP.
it("todo kind que o BE emite tem rótulo pt-BR — nada de enum cru na tela", () => {
  expect(Object.keys(KIND_LABEL).sort()).toEqual([
    "CATCH_UP",
    "DAILY_CAPTURE",
    "ENRICHMENT",
    "INITIAL_LOAD",
    "MANUAL_IMPORT",
  ]);
  for (const rotulo of Object.values(KIND_LABEL)) {
    expect(rotulo).not.toMatch(/^[A-Z_]+$/);
  }
});

it("o import manual de CNJ aparece como ação, não como enum", () => {
  expect(captureKindLabel("MANUAL_IMPORT")).toBe("Importação manual");
});

// Fallback future-proof (mesmo padrão do BE): um kind novo aparece cru em vez de
// sumir da trilha de auditoria. É rede de segurança, não o caminho normal — o teste
// acima é quem garante que o conjunto conhecido está coberto.
it("kind desconhecido não desaparece da trilha de auditoria", () => {
  expect(captureKindLabel("ALGO_NOVO")).toBe("ALGO_NOVO");
});

it("a fonte diz O QUE a captura trouxe, com a cor do badge", () => {
  expect(captureSourceLabel("DJEN")).toMatchObject({ rot: "Publicações" });
  expect(captureSourceLabel("DATAJUD")).toMatchObject({
    rot: "Enriquecimento",
  });
  expect(captureSourceLabel("OUTRA")).toMatchObject({ rot: "OUTRA" });
});
