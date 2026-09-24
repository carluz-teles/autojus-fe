import { describe, expect, it } from "vitest";

import { tituloIntimacao } from "./labels";

// tituloIntimacao(title, cnjNumber?) — o 2º argumento é OPCIONAL e aditivo
// (docs/history-design.md H1): remove o sufixo " · <CNJ desta intimação>" que o
// BE anexa no branch réu+CNJ de BuildCaseTitle, comparando EXATAMENTE contra o
// CNJ da própria intimação — nunca um regex genérico de "termina em número".
describe("tituloIntimacao", () => {
  it("sem cnjNumber (paridade com os callers existentes — Mesa/detalhe): só trim do · final", () => {
    expect(tituloIntimacao("Réu Fulano · ")).toBe("Réu Fulano");
    expect(tituloIntimacao("Classe · Assunto")).toBe("Classe · Assunto");
  });

  it("remove o sufixo quando o CNJ vem CRU (20 dígitos, como o BE anexa)", () => {
    expect(
      tituloIntimacao(
        "Réu Fulano · 10101553920238260001",
        "10101553920238260001",
      ),
    ).toBe("Réu Fulano");
  });

  it("remove o sufixo quando o CNJ do título já vem FORMATADO", () => {
    expect(
      tituloIntimacao(
        "Réu Fulano · 1010155-39.2023.8.26.0001",
        "10101553920238260001",
      ),
    ).toBe("Réu Fulano");
  });

  it("NÃO corta título numérico legítimo que não seja o CNJ desta intimação", () => {
    // título termina em número, mas não é o CNJ (ex.: nº de um processo relacionado
    // citado no assunto) — comparação exata evita falso positivo.
    expect(tituloIntimacao("Recurso nº 4521", "10101553920238260001")).toBe(
      "Recurso nº 4521",
    );
    // classe · assunto (branch sem réu) também não deve ser afetado.
    expect(
      tituloIntimacao("Execução Fiscal · Dívida Ativa", "10101553920238260001"),
    ).toBe("Execução Fiscal · Dívida Ativa");
  });

  it("cnjNumber vazio se comporta como ausente (não tenta remover nada)", () => {
    expect(tituloIntimacao("Réu Fulano · 10101553920238260001", "")).toBe(
      "Réu Fulano · 10101553920238260001",
    );
  });
});
