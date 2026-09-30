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
const render = (
  overrides: Partial<PrazoDetalheView> = {},
  declaredDeadlineDays: number | null = null,
) =>
  renderToStaticMarkup(
    <ExplicacaoPrazo
      prazo={{ ...prazo, ...overrides }}
      estado="ia"
      declaredDeadlineDays={declaredDeadlineDays}
    />,
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
  // Regressão: o marco inicial saía como o enum cru do BE ("PUBLISHED") na
  // linha 1 da explicação. Nenhum enum pode chegar à tela — nem o conhecido
  // (tem rótulo pt-BR) nem um valor novo do BE (cai no fallback).
  it("traduz o termo inicial em vez de imprimir o enum", () => {
    const html = render();
    expect(html).toContain("Publicação");
    expect(html).not.toContain("PUBLISHED");
  });
  it("marco desconhecido cai no rótulo neutro, nunca no enum", () => {
    const html = render({
      current_calculation: { ...calc, anchor_event: "MARCO_NOVO_DO_BE" },
    });
    expect(html).toContain("Marco não registrado");
    expect(html).not.toContain("MARCO_NOVO_DO_BE");
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

// P1-1 · prazo DECLARADO no teor (brief_declared_deadline_days) × contagem do
// motor. O valor só vira texto quando DIVERGE: coincidindo, "Contagem: N dias"
// já diz o mesmo e a repetição seria ruído (e pior, pareceria confirmação
// independente de um número que é o MESMO dado).
describe("ExplicacaoPrazo — prazo declarado no teor", () => {
  it("declarado DIFERE da contagem → avisa a divergência com os dois números", () => {
    const html = render({}, 5);
    expect(html).toContain("O teor declara 5 dia(s)");
    expect(html).toContain("(15)");
  });

  it("declarado IGUAL à contagem → não repete a informação", () => {
    const html = render({}, 15);
    expect(html).not.toContain("O teor declara");
  });

  it("sem brief (null) → nenhuma menção ao prazo declarado", () => {
    const html = render();
    expect(html).not.toContain("O teor declara");
  });

  // Caso REAL do banco (intimação fcae947a, prazo declarado/OPEN): o motor não
  // gravou snapshot de cálculo. Sem esta ramificação o único dado de duração
  // que existe — o que o próprio teor declara — nunca apareceria na tela.
  it("sem memória de cálculo → informa o prazo declarado (é a única duração conhecida)", () => {
    const html = render(
      { current_calculation: null, calculation_audit_status: "unavailable" },
      10,
    );
    expect(html).toContain("O teor declara 10 dia(s) de prazo");
    expect(html).not.toContain("diferente da contagem");
  });

  it("sem memória de cálculo e sem brief → segue sem nenhuma linha de prazo declarado", () => {
    const html = render({
      current_calculation: null,
      calculation_audit_status: "unavailable",
    });
    expect(html).not.toContain("O teor declara");
  });
});
