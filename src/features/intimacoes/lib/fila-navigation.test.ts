import { describe, expect, it } from "vitest";

import {
  detalheNaFila,
  retornoDaFila,
  rotuloRetornoDaFila,
} from "./fila-navigation";

describe("navegação da fila", () => {
  it("preserva o retorno à providência com o rótulo correspondente", () => {
    const retorno = "/providencias/040d0c73-1e19-4446-b25a-e4e925ef8ff5";
    expect(retornoDaFila(retorno)).toBe(retorno);
    expect(rotuloRetornoDaFila(retorno)).toBe("Voltar à providência");
    expect(
      new URL(
        detalheNaFila("origin", retorno),
        "https://local.test",
      ).searchParams.get("retorno"),
    ).toBe(retorno);
    for (const invalid of [
      "/providencias/../configuracoes",
      "/providencias/not-an-id",
      `${retorno}/../../configuracoes`,
    ]) {
      expect(retornoDaFila(invalid)).toBe("/intimacoes");
      expect(rotuloRetornoDaFila(invalid)).toBe("Voltar às intimações");
    }
  });
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
