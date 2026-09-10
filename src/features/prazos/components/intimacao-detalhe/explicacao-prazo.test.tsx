import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PrazoDetalheView } from "../../types";
import { ExplicacaoPrazo } from "./explicacao-prazo";

const prazo = {
  status: "PENDING",
  origem: "ia",
  confirmed: false,
  start_date: "2026-08-14",
  end_date: "2026-09-08",
  days: 15,
  counting: "BUSINESS",
  doubled: false,
  manual_extra_days: 0,
  calc_memory: {
    prazo_base: "15 dias",
    prazo_base_fonte: "Regra registrada para manifestação",
    termo_inicial_regra: "Exclusão do dia de início",
    dias_uteis: true,
  },
  applied_holiday: [{ data: "2026-09-07", nome: "Feriado registrado" }],
} as PrazoDetalheView;
const render = (overrides: Partial<PrazoDetalheView> = {}, estado = "ia") =>
  renderToStaticMarkup(
    <ExplicacaoPrazo prazo={{ ...prazo, ...overrides }} estado={estado} />,
  );

describe("ExplicacaoPrazo", () => {
  it("explica os dados registrados sem esconder o cálculo numa expansão", () => {
    const html = render();
    expect(html).toContain("Por que essa data?");
    expect(html).toContain("14/08/2026");
    expect(html).toContain("15 dias úteis");
    expect(html).toContain("08/09/2026");
    expect(html).toContain("Exclusão do dia de início");
    expect(html).toContain("Regra registrada para manifestação");
    expect(html).toContain("1 feriado(s)");
    expect(html).toContain(
      "justificativa específica da classificação do ato não foi registrada",
    );
    expect(html).not.toContain("<details");
  });
  it("distingue duração declarada de tipo inferido", () => {
    const html = render({ origem: "declarado" });
    expect(html).toContain("extraída da publicação");
    expect(html).toContain("Publicação de origem");
    expect(html).not.toContain("Regra registrada para manifestação");
    expect(html).toContain("classificação do ato não foi registrada");
    expect(html).not.toContain(
      "regra de prazo foi aplicada a um tipo de ato sugerido",
    );
  });
  it("não inventa fundamento quando a memória está ausente", () => {
    const html = render({ calc_memory: null, legal_citation: "" });
    expect(html).toContain("Fundamentação da duração não disponível");
    expect(html).toContain("Memória detalhada indisponível");
    expect(html).toContain("Regra de início não registrada");
  });
  it("usa os dados revisados, não a memória anterior", () => {
    const html = render({
      confirmed: true,
      days: 8,
      counting: "CALENDAR",
      legal_citation: "Referência revisada",
      holidays_applied: [],
    });
    expect(html).toContain("8 dias corridos");
    expect(html).toContain("Referência revisada");
    expect(html).toContain("0 feriado(s)");
    expect(html).not.toContain("Regra registrada para manifestação");
    expect(html).not.toContain("Exclusão do dia de início");
  });
  it("não apresenta uma data escolhida como resultado de nova contagem", () => {
    const html = render({
      cross_validation: {
        decisao: "ajuste_manual",
      } as PrazoDetalheView["cross_validation"],
    });
    expect(html).toContain("escolhido diretamente na apuração");
    expect(html).not.toContain("Etapas do cálculo");
    expect(html).not.toContain("Fonte da duração");
  });
  it("preserva ajustes e aponta divergência", () => {
    const html = render(
      { origem: "divergente", doubled: true, manual_extra_days: 2 },
      "divergente",
    );
    expect(html).toContain("diverge do cálculo");
    expect(html).toContain("Prazo em dobro registrado");
    expect(html).toContain("2 dia(s) adicional(is)");
  });
  it("não fabrica um cálculo para intimação sem prazo", () => {
    expect(render({ status: "NO_DEADLINE" }, "a_classificar")).toBe("");
  });
});
