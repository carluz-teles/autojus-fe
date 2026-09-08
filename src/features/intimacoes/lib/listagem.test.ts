import { describe, expect, it } from "vitest";

import type { IntimacaoView } from "../types";
import { gruposIntimacoes, linhaIntimacao } from "./listagem";

const item = (extra: Partial<IntimacaoView> = {}) =>
  ({
    id: "a",
    cnj_number: "40127327120268260506",
    title: "Classe · Assunto",
    autor: "Autora",
    reu: "",
    court: "TJSP",
    degree: "G1",
    user_status: "PENDING",
    estado: "declarado",
    published_at: "2026-09-08",
    prazo: {
      status: "PENDING",
      end_date: "2026-09-15",
      days_left: 9,
      tipo_ato: "manifestacao",
      selo: "a_apurar",
      confirmed: false,
    },
    ...extra,
  }) as IntimacaoView;
describe("listagem", () => {
  it("mostra publicação explícita e distingue prazo a definir de ausência de prazo", () => {
    expect(linhaIntimacao(item()).publicado).toBe("08/09/2026");
    expect(
      linhaIntimacao(
        item({
          estado: "a_classificar",
          prazo: { status: "NO_DEADLINE" } as IntimacaoView["prazo"],
        }),
      ).prazo.data,
    ).toBe("A definir");
    expect(
      linhaIntimacao(item({ estado: "sem_prazo", prazo: null })).prazo.data,
    ).toBe("Sem prazo");
  });
  it("não colore como atraso ativo uma intimação resolvida", () => {
    const i = item({ user_status: "RESOLVED" });
    i.prazo!.days_left = -8;
    expect(linhaIntimacao(i).prazo.alert).toBe(false);
    expect(linhaIntimacao(i).revisao.pending).toBe(false);
  });
  it("resume apenas os filhos filtrados, preservando pendências e responsáveis diferentes", () => {
    const a = item();
    const b = item({
      id: "b",
      estado: "a_classificar",
      prazo: null,
      assignee_user_id: "outro",
    });
    const [g] = gruposIntimacoes(
      [a, b],
      [{ cnj_number: a.cnj_number, matching_count: 2, total_count: 5 }],
    );
    expect(g.items).toHaveLength(2);
    expect(g.total_count).toBe(5);
    expect(g.pending).toBe(2);
    expect(g.pendencias).toBe("1 a classificar · 1 a revisar");
    expect(g.responsavel).toBe("Responsáveis diferentes");
    expect(g.urgente?.data).toBe("15/09/2026");
  });
});
