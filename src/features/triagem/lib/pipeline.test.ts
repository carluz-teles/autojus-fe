import { describe, expect, it } from "vitest";

import type { IntimacaoView } from "../../intimacoes/types";
import { EXCECAO_MOTIVO_LABEL, pipelineRow } from "./pipeline";

function item(overrides: Partial<IntimacaoView> = {}): IntimacaoView {
  return {
    id: "i-1",
    cnj_number: "0000000-00.2026.8.26.0001",
    class: "",
    subject: "",
    title: "Intimação",
    autor: "",
    reu: "",
    court_record_id: "cr-1",
    court: "TJSP",
    degree: "G1",
    type: "INTIMACAO",
    status: "ACTIVE",
    user_status: "PENDING",
    resolution: "",
    resolved_at: null,
    source: "DJEN",
    source_url: "",
    made_available_at: "2026-09-01T00:00:00Z",
    published_at: "2026-09-01T00:00:00Z",
    deadline_start_at: "2026-09-01T00:00:00Z",
    content_preview: "",
    estado: "sem_prazo",
    prazo: null,
    ai_analyzed_at: null,
    assignee_user_id: null,
    assignee_user_name: null,
    work_stage: "RECEIVED",
    recommended_providencia: null,
    suggested_count: 0,
    categoria_coarse: "intimacao",
    acionabilidade: "",
    provisorio: false,
    lifecycle: "a_triar",
    disposicao: "analisando",
    is_excecao: false,
    excecao_motivo: "",
    ...overrides,
  };
}

// Views mistas (status "Abertas"/"Todas" combinam lifecycles numa lista só —
// docs/navigation-architecture.md §4) escolhem RowTriar × RowReadonly POR ITEM;
// o sinal precisa sobreviver à tradução IntimacaoView → PipelineRow.
describe("pipelineRow — lifecycle por item (base da renderização mista)", () => {
  it("shows the publication act without changing the piece fallback action", () => {
    const row = pipelineRow(
      item({
        ai_act: "Especificação de Provas",
        prazo: {
          tipo_ato: "manifestacao",
          status: "OPEN",
          days_left: 5,
          end_date: "2026-09-29",
          prazo_interno: null,
        } as IntimacaoView["prazo"],
      }),
    );
    expect(row.atoPublicacao).toBe("Especificação de Provas");
    expect(row.ato).toBe("Manifestação");
  });
  it("propaga lifecycle=a_triar (linha mutável/elegível pra bulk)", () => {
    expect(pipelineRow(item({ lifecycle: "a_triar" })).lifecycle).toBe(
      "a_triar",
    );
  });

  it("propaga lifecycle=em_andamento (linha read-only)", () => {
    expect(pipelineRow(item({ lifecycle: "em_andamento" })).lifecycle).toBe(
      "em_andamento",
    );
  });

  it("propaga lifecycle=concluido (linha read-only)", () => {
    expect(pipelineRow(item({ lifecycle: "concluido" })).lifecycle).toBe(
      "concluido",
    );
  });
});

// `trabalho_divergente` (conflito prazo×obrigação, docs/navigation-architecture.md §2) é um
// motivo de exceção DISTINTO de `divergente` (divergência de PRAZO) — precisam de rótulos
// diferentes e não podem colidir.
describe("EXCECAO_MOTIVO_LABEL — trabalho_divergente não conflita com divergente", () => {
  it("tem rótulo legível próprio para trabalho_divergente", () => {
    expect(EXCECAO_MOTIVO_LABEL.trabalho_divergente).toBe(
      "Divergência entre a classificação da intimação e o trabalho identificado.",
    );
  });

  it("mantém o rótulo de divergente (prazo) intocado e distinto", () => {
    expect(EXCECAO_MOTIVO_LABEL.divergente).toBe(
      "Divergência entre a publicação e o cálculo do prazo.",
    );
    expect(EXCECAO_MOTIVO_LABEL.trabalho_divergente).not.toBe(
      EXCECAO_MOTIVO_LABEL.divergente,
    );
  });

  it("propaga o motivo trabalho_divergente via pipelineRow quando is_excecao", () => {
    const row = pipelineRow(
      item({
        disposicao: "excecao",
        is_excecao: true,
        excecao_motivo: "trabalho_divergente",
      }),
    );
    expect(row.excecaoMotivo).toBe(
      "Divergência entre a classificação da intimação e o trabalho identificado.",
    );
  });
});

// `trabalho_nao_identificado` (AUSÊNCIA — análise materializada sem trabalho/ciência
// elegível, obrigacao-first-architecture.md §E) é um motivo DISTINTO de `trabalho_divergente`
// (conflito): um é ausência de sinal, o outro é conflito entre dois sinais.
describe("EXCECAO_MOTIVO_LABEL — trabalho_nao_identificado (ausência) não conflita com trabalho_divergente (conflito)", () => {
  it("tem rótulo factual próprio para trabalho_nao_identificado", () => {
    expect(EXCECAO_MOTIVO_LABEL.trabalho_nao_identificado).toBe(
      "A análise não identificou o trabalho a realizar. Revise o teor da intimação.",
    );
  });

  it("mantém os rótulos de divergente e trabalho_divergente intocados e distintos", () => {
    expect(EXCECAO_MOTIVO_LABEL.trabalho_nao_identificado).not.toBe(
      EXCECAO_MOTIVO_LABEL.trabalho_divergente,
    );
    expect(EXCECAO_MOTIVO_LABEL.trabalho_nao_identificado).not.toBe(
      EXCECAO_MOTIVO_LABEL.divergente,
    );
  });

  it("propaga o motivo trabalho_nao_identificado via pipelineRow quando is_excecao", () => {
    const row = pipelineRow(
      item({
        disposicao: "excecao",
        is_excecao: true,
        excecao_motivo: "trabalho_nao_identificado",
      }),
    );
    expect(row.excecaoMotivo).toBe(
      "A análise não identificou o trabalho a realizar. Revise o teor da intimação.",
    );
  });
});
