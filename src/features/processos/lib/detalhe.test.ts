import { describe, expect, it } from "vitest";

import {
  intimacaoPendente,
  parseValorCausa,
  prazoPendente,
  urgenciaPrazo,
} from "./detalhe";

describe("pendências do processo", () => {
  it("separa intimações encerradas e canceladas das pendentes", () => {
    expect(
      intimacaoPendente({ status: "ACTIVE", user_status: "PENDING" }),
    ).toBe(true);
    expect(
      intimacaoPendente({ status: "ACTIVE", user_status: "RESOLVED" }),
    ).toBe(false);
    expect(
      intimacaoPendente({ status: "ACTIVE", user_status: "IGNORED" }),
    ).toBe(false);
    expect(
      intimacaoPendente({ status: "CANCELLED", user_status: "PENDING" }),
    ).toBe(false);
  });
  it("mantém vencidos em atenção sem transformar sem-prazo e encerrados em urgência", () => {
    for (const status of ["PENDING", "OPEN", "MISSED"])
      expect(prazoPendente({ status })).toBe(true);
    for (const status of ["NO_DEADLINE", "MET", "CANCELLED", "UNKNOWN"])
      expect(prazoPendente({ status })).toBe(false);
    expect(urgenciaPrazo(-2)).toMatchObject({
      label: "2 dias em atraso",
      variant: "destructive",
    });
    expect(urgenciaPrazo(0).label).toBe("Vence hoje");
  });
});

it("exclui prazos de intimações encerradas mesmo sem carregar a página da intimação", () => {
  expect(
    prazoPendente({ status: "OPEN", intimation_user_status: "RESOLVED" }),
  ).toBe(false);
  expect(
    prazoPendente({ status: "MISSED", intimation_user_status: "IGNORED" }),
  ).toBe(false);
  expect(
    prazoPendente({ status: "OPEN", intimation_status: "CANCELLED" }),
  ).toBe(false);
});

describe("edição do valor da causa", () => {
  it.each([
    ["1500.50", 1500.5],
    ["1.500,50", 1500.5],
    ["1500,50", 1500.5],
    ["1.500", 1500],
    ["0,00", 0],
    ["", null],
  ] as const)("preserva o valor de %s", (input, expected) => {
    expect(parseValorCausa(input)).toBe(expected);
  });
  it.each(["-12", "1,2,3", "abc", "12.34.56", "Infinity", "1e3"])(
    "rejeita %s",
    (input) => {
      expect(parseValorCausa(input)).toBeNaN();
    },
  );
});
