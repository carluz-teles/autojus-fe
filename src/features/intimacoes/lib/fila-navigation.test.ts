import { describe, expect, it } from "vitest";

import { detalheNaFila, retornoDaFila } from "./fila-navigation";

describe("navegação da fila", () => {
  it("preserva filtros ao abrir o detalhe", () => {
    const retorno = "/triagem?origem=declarado&urgencia=semana";
    expect(
      new URL(
        detalheNaFila("id", retorno),
        "https://local.test",
      ).searchParams.get("retorno"),
    ).toBe(retorno);
  });
  it("volta ao processo preservando os filtros de origem", () => {
    const retorno =
      "/processos/39cf2855-2854-496d-963f-7408f5d82696?retorno=%2Fprocessos%3Flifecycle%3DACTIVE";
    expect(retornoDaFila(retorno)).toBe(retorno);
    expect(
      new URL(
        detalheNaFila("id", retorno),
        "https://local.test",
      ).searchParams.get("retorno"),
    ).toBe(retorno);
    expect(retornoDaFila("/processos/../configuracoes")).toBe("/intimacoes");
  });
  it("rejeita destinos externos e rotas fora das filas", () => {
    for (const value of [
      "https://external.test",
      "//external.test",
      "/configuracoes",
      "/triagem/../configuracoes",
    ])
      expect(retornoDaFila(value)).toBe("/intimacoes");
  });
});
