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
  it("shows the publication act independently of process identity and deadline action", () => {
    const row = linhaIntimacao(
      item({
        title: "Réu Fulano · 40127327120268260506",
        ai_act: "Especificação de Provas",
        degree: "UNKNOWN",
      }),
    );
    expect(row.title).toBe("Réu Fulano");
    expect(row.ato).toBe("Especificação de Provas");
    expect(row.tribunal).toBe("TJSP · Grau não informado");
  });
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
  // H2 (docs history-design.md): published_at é a âncora cronológica do histórico;
  // quando o DJEN não a informa, cai no instante em que a captura ficou disponível
  // — mas isso NÃO é a publicação, então o rótulo muda pra "Disponibilizada".
  it("publicação cai em made_available_at quando published_at está vazio (H2), com rótulo distinto", () => {
    const row = linhaIntimacao(
      item({ published_at: "", made_available_at: "2026-09-10T12:00:00Z" }),
    );
    expect(row.publicado).toBe("10/09/2026");
    expect(row.publicadoRotulo).toBe("Disponibilizada");
  });
  it("rotula 'Publicada' quando published_at existe", () => {
    expect(linhaIntimacao(item()).publicadoRotulo).toBe("Publicada");
  });
  it("publicado fica 'Não informada' só quando os dois estão vazios", () => {
    expect(
      linhaIntimacao(item({ published_at: "", made_available_at: "" }))
        .publicado,
    ).toBe("Não informada");
  });
  // H1 (docs history-design.md): título sem CNJ duplicado — deriva do CNJ desta
  // própria intimação (mesmo helper canônico usado por Mesa/detalhe, agora com o
  // 2º argumento opcional).
  it("título do histórico remove o sufixo CNJ cru que o BE anexa (H1)", () => {
    expect(
      linhaIntimacao(
        item({
          title: "Réu Fulano · 40127327120268260506",
          cnj_number: "40127327120268260506",
        }),
      ).title,
    ).toBe("Réu Fulano");
  });
  it("não colore como atraso ativo uma intimação resolvida", () => {
    const i = item({ user_status: "RESOLVED" });
    i.prazo!.days_left = -8;
    expect(linhaIntimacao(i).prazo.alert).toBe(false);
  });
  it("resume apenas os filhos filtrados, preservando responsáveis diferentes", () => {
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
    expect(g.responsavel).toBe("Responsáveis diferentes");
    expect(g.urgente?.data).toBe("15/09/2026");
  });
});
