import { describe, expect, it } from "vitest";

import { resolverModoDetalhe } from "./modo-detalhe";

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
