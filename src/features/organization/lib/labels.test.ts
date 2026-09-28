import { describe, expect, it } from "vitest";

import { iniciais, nomeExibicao, roleLabel } from "./labels";

// ITEM 3 (classe) — o fallback devolvia o enum CRU do BE, e o card de Equipe o
// renderiza direto ("OWNER · Ativo"). Papel desconhecido vira rótulo neutro.
describe("roleLabel", () => {
  it("traduz os papéis conhecidos", () => {
    expect(roleLabel("LAWYER")).toBe("Advogado");
    expect(roleLabel("ADMIN")).toBe("Administrador");
  });

  it("papel desconhecido NÃO vaza o enum cru", () => {
    expect(roleLabel("OWNER")).toBe("Membro");
    expect(roleLabel("")).toBe("Membro");
    expect(roleLabel("OWNER")).not.toContain("OWNER");
  });
});

describe("nomeExibicao", () => {
  it("usa o nome quando existe", () => {
    expect(nomeExibicao("Ana Souza", "ana@x.com")).toBe("Ana Souza");
  });

  it("cai na parte local do e-mail e NUNCA no id cru", () => {
    expect(nomeExibicao("", "ana.souza@x.com")).toBe("ana.souza");
    expect(nomeExibicao(null, null)).toBe("");
  });
});

describe("iniciais", () => {
  it("usa a 1ª e a última palavra", () => {
    expect(iniciais("Ana Maria Souza")).toBe("AS");
    expect(iniciais("Ana")).toBe("AN");
    expect(iniciais("   ")).toBe("—");
  });
});
