import { describe, expect, it } from "vitest";

import { shouldForceAutoLoader } from "./auto-flow";

const base = {
  stage: "pregen",
  isAutoFlow: true,
  hasContent: false,
  isGenerating: false,
  sagaState: "CREATED",
};

describe("shouldForceAutoLoader — recuperação vs loader infinito", () => {
  it("FALHA do auto (CREATED, sem conteúdo, sem geração) → NÃO força o loader (cai no pregen recuperável)", () => {
    // Este é o caso crítico do reviewer: a sequência conferência→generate falhou
    // (timeout/failed/erro), o rascunho ficou CREATED sem stream que avance o
    // loader. Deve retornar false para cair no PreparationCanvas (recuperável).
    expect(shouldForceAutoLoader(base)).toBe(false);
  });

  it("geração em curso (mutação pendente) → força o loader", () => {
    expect(shouldForceAutoLoader({ ...base, isGenerating: true })).toBe(true);
  });

  it("saga EXTRACTING (sucesso) → força o loader", () => {
    // Nota: na prática deriveStage já retorna "gerando" para EXTRACTING; este
    // ramo é defensivo caso o stage ainda esteja "pregen" na janela de transição.
    expect(shouldForceAutoLoader({ ...base, sagaState: "EXTRACTING" })).toBe(
      true,
    );
  });

  it("sem auto=1 → nunca força o loader (fluxo manual usa o pregen normal)", () => {
    expect(
      shouldForceAutoLoader({ ...base, isAutoFlow: false, isGenerating: true }),
    ).toBe(false);
  });

  it("rascunho com conteúdo → não é fresh, não força o loader", () => {
    expect(
      shouldForceAutoLoader({ ...base, hasContent: true, isGenerating: true }),
    ).toBe(false);
  });

  it("estágio não-pregen (ex.: gerando) → não intercepta (caminho normal cuida)", () => {
    expect(
      shouldForceAutoLoader({ ...base, stage: "gerando", isGenerating: true }),
    ).toBe(false);
  });

  it("estágio pronta → não intercepta", () => {
    expect(shouldForceAutoLoader({ ...base, stage: "pronta" })).toBe(false);
  });
});
