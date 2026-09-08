import { describe, expect, it } from "vitest";

import type { ProcessoView } from "../types";
import {
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
