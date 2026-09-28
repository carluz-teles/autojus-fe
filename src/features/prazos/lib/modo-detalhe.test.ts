import { describe, expect, it } from "vitest";

import { capacidadesDoModo, resolverModoDetalhe } from "./modo-detalhe";

// REGRESSÃO (item 6) — `/intimacoes/<id>` e a Mesa de Trabalho divergiam para a
// MESMA intimação: o modo "consulta" descartava a barra de ações inteira, então
// o histórico não tinha "Gerar peça", "Dar ciência" nem "Revisar tipo/prazo".
// A decisão do produto é que as duas telas mostram os mesmos dados e permitem as
// mesmas ações; consulta só GANHA "Abrir na Mesa". Esta é a cerca.
describe("capacidadesDoModo", () => {
  it("consulta NÃO subtrai as ações de execução (a regressão)", () => {
    expect(capacidadesDoModo("consulta").executar).toBe(true);
  });

  it("execução mantém as ações", () => {
    expect(capacidadesDoModo("execucao").executar).toBe(true);
  });

  it("os dois modos permitem exatamente as mesmas ações", () => {
    expect(capacidadesDoModo("consulta").executar).toBe(
      capacidadesDoModo("execucao").executar,
    );
  });

  it('"Abrir na Mesa" é o ÚNICO extra da consulta — a Mesa não o mostra', () => {
    expect(capacidadesDoModo("consulta").abrirNaMesa).toBe(true);
    expect(capacidadesDoModo("execucao").abrirNaMesa).toBe(false);
  });
});

describe("resolverModoDetalhe", () => {
  it("painel explícito sempre vence, independente do retorno", () => {
    expect(resolverModoDetalhe("consulta", "/triagem")).toBe("consulta");
    expect(resolverModoDetalhe("execucao", "/intimacoes")).toBe("execucao");
  });

  it("modo página: retorno da Mesa infere execução", () => {
    expect(resolverModoDetalhe(undefined, "/triagem")).toBe("execucao");
    expect(resolverModoDetalhe(undefined, "/triagem?tab=em_andamento")).toBe(
      "execucao",
    );
  });

  it("modo página: qualquer outro retorno (Intimações, processo) infere consulta", () => {
    expect(resolverModoDetalhe(undefined, "/intimacoes")).toBe("consulta");
    expect(
      resolverModoDetalhe(
        undefined,
        "/processos/00000000-0000-0000-0000-000000000000",
      ),
    ).toBe("consulta");
  });
});
