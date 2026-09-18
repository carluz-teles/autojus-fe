import { describe, expect, it } from "vitest";

import { deriveStage } from "./use-construction";

// Fluxo DIRETO: um prompt → geração. `deriveStage` é a decisão pura do centro da
// tela. Com o wizard removido, o único caminho é:
//   pregen (CTA "Gerar peça")  →  [clicou → firedGenerate]  →  gerando  →  pronta
// Estes testes fixam esse contrato — o disparo direto depende do flag
// `firedGenerate` para não piscar de volta ao prompt na janela entre o POST
// /generate e o saga avançar para EXTRACTING no próximo poll.
describe("deriveStage (fluxo direto de geração)", () => {
  it("peça vazia recém-criada, antes de disparar, mostra o prompt (pregen)", () => {
    expect(deriveStage("CREATED", false)).toBe("pregen");
    expect(deriveStage(undefined, false)).toBe("pregen");
  });

  it("logo após clicar 'Gerar peça' entra em gerando mesmo com o saga ainda CREATED", () => {
    // Janela otimista: o POST /generate voltou 202 mas o worker ainda não
    // avançou o saga. Sem o flag, o centro voltaria ao prompt.
    expect(deriveStage("CREATED", true)).toBe("gerando");
    expect(deriveStage(undefined, true)).toBe("gerando");
  });

  it("com o worker redigindo (EXTRACTING) o centro fica em gerando", () => {
    expect(deriveStage("EXTRACTING", true)).toBe("gerando");
    expect(deriveStage("EXTRACTING", false)).toBe("gerando");
  });

  it("saga concluído (DRAFTED/REVIEWED) abre o editor (pronta), independente do flag", () => {
    expect(deriveStage("DRAFTED", false)).toBe("pronta");
    expect(deriveStage("REVIEWED", true)).toBe("pronta");
  });

  it("falha na 1ª geração (sem conteúdo) cai em falha; regeração de peça com conteúdo permanece pronta", () => {
    expect(deriveStage("FAILED", true, false)).toBe("falha");
    // Regeração: já existe folha → o novo texto streama dentro da peça pronta.
    expect(deriveStage("CREATED", true, true)).toBe("pronta");
    expect(deriveStage("EXTRACTING", true, true)).toBe("pronta");
  });
});
