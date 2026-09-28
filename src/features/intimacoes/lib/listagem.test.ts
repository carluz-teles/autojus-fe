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
  // O countdown é o delta de CALENDÁRIO até a data fatal; o regime de contagem
  // (dias úteis vs corridos) é outro eixo e vive no "Por que essa data?". Rotular o
  // countdown como "corridos" contradiz o prazo em dias úteis — que é a regra da
  // esmagadora maioria dos prazos. Já regrediu em 3 telas; este teste é a cerca.
  it("nomeia o countdown de forma NEUTRA — nunca afirma o regime de contagem", () => {
    const futuro = linhaIntimacao(item()).prazo.relative;
    expect(futuro).toBe("9 dias até o vencimento");
    expect(futuro).not.toMatch(/corrido|útil|uteis|úteis/i);

    const atraso = linhaIntimacao(
      item({
        prazo: {
          status: "PENDING",
          end_date: "2026-09-01",
          days_left: -3,
          tipo_ato: "manifestacao",
          selo: "a_apurar",
          confirmed: false,
        },
      } as Partial<IntimacaoView>),
    ).prazo.relative;
    expect(atraso).toBe("3 dias em atraso");
    expect(atraso).not.toMatch(/corrido|útil|uteis|úteis/i);

    // Singular tratado (o rótulo antigo dizia "1 dias").
    expect(
      linhaIntimacao(
        item({
          prazo: {
            status: "PENDING",
            end_date: "2026-09-09",
            days_left: 1,
            tipo_ato: "manifestacao",
            selo: "a_apurar",
            confirmed: false,
          },
        } as Partial<IntimacaoView>),
      ).prazo.relative,
    ).toBe("1 dia até o vencimento");
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
  // ITEM 2 — `brief_summary` ("o que aconteceu", 1 linha) está preenchido em
  // TODOS os briefs do tenant e já vem na projeção do BE, mas a lista de
  // intimações não o lia: o card mostrava só o DUMP do teor cru (content_preview,
  // ~500 chars cortados no meio da palavra). O resumo é o subtítulo; o teor cru é
  // só o fallback de quem ainda não tem brief.
  it("expõe o resumo do brief como subtítulo da linha", () => {
    const row = linhaIntimacao(
      item({
        brief_summary: "Sentença de procedência parcial; cabe apelação.",
        content_preview: "PROCESSO Nº 4012732... PAULO SERGIO DE OLIVEI",
      }),
    );
    expect(row.summary).toBe("Sentença de procedência parcial; cabe apelação.");
  });

  it("resumo vazio cai no teor cru (comportamento anterior preservado)", () => {
    const row = linhaIntimacao(
      item({ brief_summary: "", content_preview: "Teor cru da publicação" }),
    );
    expect(row.summary).toBe("");
    expect(row.preview).toBe("Teor cru da publicação");
  });

  // O teor cru chega truncado pelo BE em ~500 chars, cortando no meio da palavra
  // ("…PAULO SERGIO DE OLIVEI"). Enquanto ele é o fallback, a última palavra
  // parcial sai e entra uma elipse — cortar no meio da palavra é sempre defeito.
  it("apara a palavra partida do teor truncado", () => {
    const row = linhaIntimacao(
      item({
        brief_summary: "",
        content_preview: `${"a".repeat(480)} PAULO SERGIO DE OLIVEI`,
      }),
    );
    expect(row.preview.endsWith("PAULO SERGIO DE…")).toBe(true);
    expect(row.preview).not.toContain("OLIVEI");
  });

  it("teor curto (não truncado) fica intacto, sem elipse", () => {
    expect(
      linhaIntimacao(
        item({ brief_summary: "", content_preview: "Teor curto." }),
      ).preview,
    ).toBe("Teor curto.");
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
