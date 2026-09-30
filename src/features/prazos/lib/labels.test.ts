import { describe, expect, it } from "vitest";

import {
  contagemLabel,
  TERMO_INICIAL_OPCOES,
  termoInicialLabel,
} from "./labels";

// O card "Por que essa data?" e a memória do cálculo imprimiam `anchor_event`
// cru ("PUBLISHED"). O contrato aqui é o inverso: nenhum valor de wire escapa
// para a tela — conhecido vira rótulo, desconhecido vira texto neutro.
describe("termoInicialLabel", () => {
  it("traduz os três marcos que o BE emite", () => {
    expect(termoInicialLabel("DEADLINE_START")).toBe(
      "Início informado na intimação",
    );
    expect(termoInicialLabel("PUBLISHED")).toBe("Publicação");
    expect(termoInicialLabel("MADE_AVAILABLE")).toBe("Disponibilização");
  });

  it("marco novo do BE ou ausente não vaza o enum", () => {
    expect(termoInicialLabel("MARCO_NOVO")).toBe("Marco não registrado");
    expect(termoInicialLabel("")).toBe("Marco não registrado");
  });

  it("aceita fallback do chamador para quem escreve outra frase de ausência", () => {
    expect(termoInicialLabel("", "Não informado")).toBe("Não informado");
  });
});

describe("TERMO_INICIAL_OPCOES", () => {
  // O select de revisão deriva daqui; a ordem é o default do BE primeiro.
  it("oferece os marcos com rótulo, na ordem de exibição", () => {
    expect(TERMO_INICIAL_OPCOES).toEqual([
      ["DEADLINE_START", "Início informado na intimação"],
      ["PUBLISHED", "Publicação"],
      ["MADE_AVAILABLE", "Disponibilização"],
    ]);
  });

  it("todo valor do select tem o mesmo rótulo que a tela exibe", () => {
    for (const [value, label] of TERMO_INICIAL_OPCOES)
      expect(termoInicialLabel(value)).toBe(label);
  });
});

describe("contagemLabel", () => {
  it("só BUSINESS conta em dias úteis", () => {
    expect(contagemLabel("BUSINESS")).toBe("úteis");
    expect(contagemLabel("CALENDAR")).toBe("corridos");
  });

  it("valor inesperado conta corrido (regime mais conservador na contagem)", () => {
    expect(contagemLabel("")).toBe("corridos");
  });
});
