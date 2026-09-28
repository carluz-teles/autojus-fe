import { describe, expect, it } from "vitest";

import { resumoLote } from "./batch-result";

describe("resumoLote", () => {
  it("lote 100% sucesso: só mensagem de sucesso", () => {
    const { mensagens } = resumoLote(
      { succeeded: ["a", "b", "c"], failed: [] },
      { singular: "item", plural: "itens" },
    );
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]).toEqual({ tom: "success", texto: "3 itens." });
  });

  it("lote parcial: sucesso E falha são reportados separadamente (nenhum tudo-ou-nada)", () => {
    const { mensagens } = resumoLote(
      { succeeded: ["a", "b"], failed: ["c"] },
      { singular: "item", plural: "itens" },
    );
    expect(mensagens).toHaveLength(2);
    expect(mensagens[0].tom).toBe("success");
    expect(mensagens[0].texto).toContain("2 itens");
    expect(mensagens[1].tom).toBe("error");
    expect(mensagens[1].texto).toContain("1 item");
    expect(mensagens[1].texto).toContain("permanece selecionado");
  });

  it("lote 100% falha: só mensagem de erro, no plural quando >1", () => {
    const { mensagens } = resumoLote(
      { succeeded: [], failed: ["a", "b"] },
      { singular: "item", plural: "itens" },
    );
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0].tom).toBe("error");
    expect(mensagens[0].texto).toContain("2 itens");
    expect(mensagens[0].texto).toContain("permanecem selecionados");
  });

  it("singular correto quando exatamente 1 sucesso e 1 falha", () => {
    const { mensagens } = resumoLote(
      { succeeded: ["a"], failed: ["b"] },
      { singular: "prazo confirmado", plural: "prazos confirmados" },
    );
    expect(mensagens[0].texto).toBe("1 prazo confirmado.");
    expect(mensagens[1].texto).toContain("1 item");
    expect(mensagens[1].texto).toContain("permanece selecionado");
  });
});
