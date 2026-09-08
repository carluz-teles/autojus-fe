import { describe, expect, it } from "vitest";

import type { PrazoDetalheView } from "../types";
import {
  dataEscolhidaNaApuracao,
  documentoOrigemUrl,
  feriadosVigentes,
  formatarCNJ,
  situacaoRevisao,
} from "./detalhe-apresentacao";

describe("apresentação do detalhe", () => {
  it("preserva nomes só dos feriados que continuam no cálculo revisado", () => {
    const p = {
      confirmed: true,
      holidays_applied: ["2026-09-07T00:00:00Z", "2026-09-10"],
      applied_holiday: [
        {
          data: "2026-09-07",
          nome: "Independência do Brasil",
          ambito: "nacional",
        },
        { data: "2026-09-08", nome: "Feriado anterior" },
      ],
    } as PrazoDetalheView;
    expect(feriadosVigentes(p).map((h) => h.nome)).toEqual([
      "Independência do Brasil",
      "Feriado ou suspensão",
    ]);
  });
  it("não confunde revisão humana com cumprimento nem oculta divergência", () => {
    const p = { confirmed: true, status: "OPEN" } as PrazoDetalheView;
    expect(situacaoRevisao(p, "declarado").label).toBe("Prazo revisado");
    expect(
      situacaoRevisao(
        {
          ...p,
          cross_validation: { resultado: "divergente", decisao: "" },
        } as PrazoDetalheView,
        "declarado",
      ).label,
    ).toBe("Divergência pendente");
    expect(
      situacaoRevisao(
        { ...p, confirmed: false, status: "NO_DEADLINE" },
        "a_classificar",
      ).pendente,
    ).toBe(true);
    expect(
      situacaoRevisao(
        { ...p, confirmed: false, status: "NO_DEADLINE" },
        "sem_prazo",
      ).pendente,
    ).toBe(false);
  });
  it("aceita o prazo declarado mesmo com uma comparação antiga pendente", () => {
    const p = {
      origem: "declarado",
      status: "OPEN",
      confirmacao_exigida: true,
      cross_validation: { resultado: "divergente", decisao: "" },
    } as PrazoDetalheView;
    expect(situacaoRevisao(p, "declarado")).toEqual({
      label: "Prazo declarado aceito",
      pendente: false,
    });
    expect(situacaoRevisao(p, "ia")).toEqual({
      label: "Tipo a confirmar",
      pendente: true,
    });
    expect(situacaoRevisao({ ...p, status: "MET" }, "declarado").label).toBe(
      "Prazo cumprido",
    );
  });
  it("distingue uma data escolhida do recálculo da contagem", () => {
    expect(
      dataEscolhidaNaApuracao({
        cross_validation: { decisao: "aceita_calculado" },
      } as PrazoDetalheView),
    ).toBe(true);
    expect(
      dataEscolhidaNaApuracao({
        cross_validation: { decisao: "aceita_declarado" },
      } as PrazoDetalheView),
    ).toBe(false);
  });
  it("formata o CNJ e só oferece documentos com URL http(s)", () => {
    expect(formatarCNJ("40127327120268260506")).toBe(
      "4012732-71.2026.8.26.0506",
    );
    expect(documentoOrigemUrl("javascript:alert(1)")).toBeNull();
    expect(documentoOrigemUrl("https://example.test/documento")).toBe(
      "https://example.test/documento",
    );
    expect(documentoOrigemUrl("")).toBeNull();
  });
});
