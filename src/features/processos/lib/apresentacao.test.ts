import { describe, expect, it } from "vitest";

import type { ProcessoView } from "../types";
import {
  assuntosDoProcesso,
  CLAIM_VALUE_SOURCE_LABEL,
  CLIENT_ROLE_LABEL,
  linhaProcesso,
  retornoProcessos,
  situacaoProcesso,
} from "./apresentacao";

const processo = {
  id: "one",
  cnj_number: "40127327120268260506",
  title: "Processo",
  court: "TJSP",
  degree: "G1",
  lifecycle: "ACTIVE",
  autor: "Ana",
  reu: "Empresa",
  next_deadline: null,
  last_movement_at: "2026-09-08T00:00:00Z",
  last_movement_text: "Conclusos",
  assigned_user_id: null,
  assigned_user_name: null,
} as ProcessoView;

describe("listagem de processos", () => {
  it("preserva o dia da movimentação e distingue ausência de prazo ativo", () => {
    const row = linhaProcesso(processo);
    expect(row.movimentoData).toBe("08/09/2026");
    expect(row.prazo).toBeNull();
    expect(row.responsavel).toBe("Sem responsável");
    expect(row.cnj).toBe("4012732-71.2026.8.26.0506");
  });
  it("preserva filtros no retorno e recusa destinos externos ou outra rota", () => {
    expect(retornoProcessos("/processos?q=Ana&lifecycle=SUSPENDED")).toBe(
      "/processos?q=Ana&lifecycle=SUSPENDED",
    );
    for (const value of [
      null,
      "https://example.com/processos",
      "//example.com",
      "/processos/123",
    ])
      expect(retornoProcessos(value)).toBe("/processos");
  });
});

describe("situação do processo", () => {
  it("não apresenta o ACTIVE legado sem evidência como confirmado", () => {
    const view = situacaoProcesso(processo);
    expect(view.label).toBe("A verificar");
    expect(view.consulta).toBe("Ainda não consultado");
  });
  it("mostra a movimentação de reativação e a data da consulta separadamente", () => {
    const view = situacaoProcesso({
      ...processo,
      lifecycle_evidence: {
        source: "DATAJUD",
        method: "STATE_MOVEMENT",
        reason: "Situação inferida da movimentação processual",
        movement_code: 849,
        movement_text: "Reativação",
        movement_at: "2022-08-24T08:12:23-03:00",
        observed_at: "2026-09-06T12:00:00Z",
      },
    });
    expect(view.label).toBe("Em andamento");
    expect(view.resumo).toBe("Situação inferida");
    expect(view.movimento).toBe("Reativação");
    expect(view.dataMovimento).toBe("24/08/2022");
    expect(view.consulta).toBe("06/09/2026");
  });
  it("não transforma uma situação desconhecida em processo ativo", () => {
    expect(situacaoProcesso({ ...processo, lifecycle: "UNKNOWN" }).label).toBe(
      "A verificar",
    );
  });
});

// Cockpit R4.2 (P0-3) — rótulos pt-BR de client_role (court_case.client_role) e
// claim_value_source (court_record.claim_value_source), ambos CHECK constraints
// de migrations/0180_ingestao_v2_columns.up.sql.
describe("CLIENT_ROLE_LABEL", () => {
  // Reviewer (LOW, pré-merge): "UNKNOWN" NÃO entra no mapa — o único consumidor
  // (processo-hub.tsx) desvia UNKNOWN pra "Não informado" antes de indexar,
  // então uma entrada UNKNOWN aqui seria morta e duplicaria o mesmo significado
  // de "ausente" com uma segunda string ("Não identificado"). Só os 3 valores
  // DETERMINADOS do CHECK de court_case.client_role têm rótulo.
  it("cobre os 3 valores determinados do CHECK (exclui UNKNOWN, que o consumidor desvia antes)", () => {
    expect(CLIENT_ROLE_LABEL).toEqual({
      PLAINTIFF: "Autor(a)",
      DEFENDANT: "Réu(é)",
      BOTH: "Autor(a) e réu(é)",
    });
  });
});

describe("CLAIM_VALUE_SOURCE_LABEL", () => {
  it("cobre os 2 valores do CHECK de court_record.claim_value_source", () => {
    expect(CLAIM_VALUE_SOURCE_LABEL).toEqual({
      capa: "Capa do processo",
      manual: "Informado manualmente",
    });
  });
});

describe("assuntosDoProcesso", () => {
  const base = { subject: "", subjects: null } as const;

  it("com subjects → chips, um por assunto, na ordem recebida", () => {
    const r = assuntosDoProcesso({
      ...base,
      subjects: [
        { codigo: 7771, nome: "Indenização por Dano Moral" },
        { codigo: 7772, nome: "Indenização por Dano Material" },
      ],
    });
    expect(r.chips.map((s) => s.nome)).toEqual([
      "Indenização por Dano Moral",
      "Indenização por Dano Material",
    ]);
    expect(r.texto).toBe("");
  });

  it("o rótulo acompanha a cardinalidade (um assunto não lê como vários, nem o contrário)", () => {
    expect(
      assuntosDoProcesso({ ...base, subjects: [{ codigo: 1, nome: "A" }] })
        .label,
    ).toBe("Assunto");
    expect(
      assuntosDoProcesso({
        ...base,
        subjects: [
          { codigo: 1, nome: "A" },
          { codigo: 2, nome: "B" },
        ],
      }).label,
    ).toBe("Assuntos");
  });

  it("sem subjects → cai no `subject` legado como TEXTO (processo só-DJEN)", () => {
    const r = assuntosDoProcesso({
      subject: "Nota Promissória",
      subjects: null,
    });
    expect(r.chips).toEqual([]);
    expect(r.texto).toBe("Nota Promissória");
    expect(r.label).toBe("Assunto");
  });

  it("array VAZIO é ausência, não 'zero chips' — cai no mesmo fallback do null", () => {
    expect(assuntosDoProcesso({ subject: "X", subjects: [] }).texto).toBe("X");
  });

  it("sem nenhum dos dois → ausência explícita", () => {
    expect(assuntosDoProcesso(base).texto).toBe("Não informado");
  });
});
