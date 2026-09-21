import { describe, expect, it } from "vitest";

import {
  detalheNaFila,
  retornoDaFila,
  rotuloRetornoDaFila,
} from "./fila-navigation";

describe("navegação da fila", () => {
  it("rejeita retornos inválidos e cai nas intimações", () => {
    for (const invalid of [
      "/providencias/040d0c73-1e19-4446-b25a-e4e925ef8ff5",
      "/processos/../configuracoes",
      "/processos/not-an-id",
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
