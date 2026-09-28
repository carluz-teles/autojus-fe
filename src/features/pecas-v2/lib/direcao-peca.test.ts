import { describe, expect, it } from "vitest";

import { direcaoDaPeca, prazoProvidenciaLabel } from "./direcao-peca";

// ITEM 5 — o bloco "Direção da peça" afirmava "Objetivo não confirmado nesta
// peça" mesmo com a peça JÁ gerada e o objetivo estampado no título da tela. A
// causa é que ele lia SÓ `instructions` (a orientação livre e OPCIONAL que o
// advogado digita no modal — "Pular" a deixa ""), tratando ausência de
// orientação como ausência de objetivo. São coisas diferentes: o objetivo da
// peça está confirmado no título desde a criação. A UI não pode negar um dado
// que ela mesma está exibindo duas linhas acima.
describe("direcaoDaPeca", () => {
  it("usa a orientação do advogado quando existe", () => {
    expect(
      direcaoDaPeca("Focar na ilegitimidade passiva.", "Contestação"),
    ).toBe("Focar na ilegitimidade passiva.");
  });

  it("cai no objetivo JÁ confirmado (título) em vez de negá-lo", () => {
    const texto = direcaoDaPeca("", "Apresentar memória de cálculo atualizada");
    expect(texto).toBe("Apresentar memória de cálculo atualizada");
    expect(texto).not.toMatch(/não confirmado/i);
  });

  it("orientação só de espaços em branco conta como ausente", () => {
    expect(direcaoDaPeca("   \n  ", "Contestação")).toBe("Contestação");
  });

  it("sem orientação E sem título, não afirma nada sobre o objetivo", () => {
    const texto = direcaoDaPeca("", "");
    expect(texto).toBe("Sem orientação específica para esta peça.");
    expect(texto).not.toMatch(/objetivo/i);
  });

  it("aceita campos ausentes (peça legada sem instructions)", () => {
    expect(direcaoDaPeca(undefined, "Contestação")).toBe("Contestação");
  });
});

// ITEM 4 — o painel se contradizia: "Prazo da intimação · 30/09/2026" no topo e
// "Prazo: Não definido" poucas linhas abaixo. São prazos de coisas DIFERENTES (o
// da intimação e o da providência/action_item). Duas correções na mesma causa:
// (a) o rótulo passa a dizer de QUEM é o prazo; (b) providência sem prazo não
// rende linha nenhuma — "Não definido" ao lado de uma data real só é lido como
// defeito e não carrega informação alguma.
describe("prazoProvidenciaLabel", () => {
  it("nomeia explicitamente o dono do prazo", () => {
    expect(prazoProvidenciaLabel("2026-10-15T00:00:00Z")).toBe(
      "Prazo da providência: 15/10/2026",
    );
  });

  it("não inventa linha quando a providência não tem prazo", () => {
    expect(prazoProvidenciaLabel(null)).toBe("");
    expect(prazoProvidenciaLabel("")).toBe("");
  });

  it("lê a data como UTC — não desloca o dia por fuso", () => {
    expect(prazoProvidenciaLabel("2026-01-01T00:00:00Z")).toBe(
      "Prazo da providência: 01/01/2026",
    );
  });

  it("nunca devolve o rótulo genérico que causava a contradição", () => {
    expect(prazoProvidenciaLabel("2026-10-15T00:00:00Z")).not.toMatch(
      /^Prazo:/,
    );
  });
});
