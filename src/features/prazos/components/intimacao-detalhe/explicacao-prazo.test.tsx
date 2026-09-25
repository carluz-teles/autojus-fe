import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CalculationSnapshot, PrazoDetalheView } from "../../types";
import { ExplicacaoPrazo } from "./explicacao-prazo";

const calc: CalculationSnapshot = {
  schema_version: 1,
  tipo_ato: "manifestacao",
  rito: "comum_civel",
  rule_key: "manifestacao",
  fallback_used: false,
  reason: "Comando explícito na publicação",
  source: "rule",
  protected: false,
  days: 15,
  counting: "BUSINESS",
  doubled: false,
  manual_extra_days: 0,
  anchor_event: "PUBLISHED",
  start_date: "2026-08-14",
  end_date: "2026-09-08",
  legal_citation: "Regra registrada para manifestação",
  holidays_applied: ["2026-09-07"],
  calendar_provider_version: null,
};
const prazo = {
  status: "PENDING",
  current_calculation: calc,
  calculation_audit_status: "current",
} as PrazoDetalheView;
const render = (overrides: Partial<PrazoDetalheView> = {}) =>
  renderToStaticMarkup(
    <ExplicacaoPrazo prazo={{ ...prazo, ...overrides }} estado="ia" />,
  );

describe("ExplicacaoPrazo — memória corrente", () => {
  it("explica a contagem a partir do snapshot corrente", () => {
    const html = render();
    expect(html).toContain("14/08/2026");
    expect(html).toContain("15 dias úteis");
    expect(html).toContain("08/09/2026");
    expect(html).toContain("Regra registrada para manifestação");
    expect(html).toContain("1 feriado(s)");
    expect(html).not.toContain("<details");
  });
  it("distingue duração declarada de tipo inferido", () => {
    const html = render({
      current_calculation: {
        ...calc,
        source: "declared",
        legal_citation: null,
      },
    });
    expect(html).toContain("informada na publicação");
    expect(html).toContain("Publicação de origem");
    expect(html).not.toContain("Regra registrada para manifestação");
  });
  it("não apresenta memória histórica como cálculo atual", () => {
    const html = render({
      current_calculation: null,
      calculation_audit_status: "historical",
      calc_memory: {
        prazo_base: "5 dias",
        prazo_base_fonte: "Regra antiga",
        termo_inicial_regra: "Antigo",
        dias_uteis: true,
      },
    });
    expect(html).toContain("memória disponível é histórica");
    expect(html).not.toContain("5 dias");
    expect(html).not.toContain("Regra antiga");
  });
  it("dados atuais indisponíveis são declarados como tal", () => {
    const html = render({
      current_calculation: null,
      calculation_audit_status: "unavailable",
    });
    expect(html).toContain("memória do cálculo atual não está disponível");
    expect(html).not.toContain("Etapas do cálculo registrado");
  });
  it("data protegida e fallback ficam explícitos", () => {
    const html = render({
      current_calculation: {
        ...calc,
        source: "generic_fallback",
        fallback_used: true,
        protected: true,
      },
    });
    expect(html).toContain("regra genérica");
    expect(html).toContain("protegida");
  });
  it("não fabrica cálculo para ausência de prazo", () => {
    expect(render({ status: "NO_DEADLINE" })).toBe("");
  });
});
