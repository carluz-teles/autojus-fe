import { describe, expect, it } from "vitest";

import type { PrazoDetalheView } from "../types";
import {
  dataEscolhidaNaApuracao,
  documentoOrigemUrl,
  feriadosVigentes,
  formatarCNJ,
  motivoRevisaoLabel,
  origemRevisaoLabel,
  situacaoRevisao,
  tipoRevisaoLabel,
} from "./detalhe-apresentacao";

describe("apresentação do detalhe", () => {
  it("apresenta origem e tipo legíveis sem exibir enums crus", () => {
    expect(origemRevisaoLabel("generic_fallback")).toBe(
      "Base genérica provisória",
    );
    expect(origemRevisaoLabel("declared")).toBe("Informado na publicação");
    expect(origemRevisaoLabel("manual")).toBe("Ajustado manualmente");
    expect(origemRevisaoLabel("unexpected_origin")).toBe(
      "Origem não informada",
    );
    expect(
      tipoRevisaoLabel(
        "impugnacao_cumprimento",
        "Impugnação ao cumprimento de sentença",
      ),
    ).toBe("Impugnação ao cumprimento de sentença");
    expect(tipoRevisaoLabel("impugnacao_cumprimento")).toBe("Tipo registrado");
    expect(
      motivoRevisaoLabel(
        "generic_fallback",
        "Base genérica ou provisória requer revisão.",
      ),
    ).toBe("Confira a contagem antes de confirmar.");
  });
  it("não apresenta ciência com prazo ativo como classificação aceita", () => {
    const p = {
      status: "OPEN",
      origem: "declarado",
      tipo_ato: "ciencia",
      confirmed: false,
    } as PrazoDetalheView;
    expect(situacaoRevisao(p, "declarado")).toEqual({
      label: "Tipo incompatível com prazo · revisar",
      pendente: true,
    });
    expect(
      situacaoRevisao({ ...p, confirmed: true }, "declarado").pendente,
    ).toBe(false);
  });
  it("mostra apenas feriados do snapshot corrente, sem nomes da memória histórica", () => {
    const p = {
      calculation_audit_status: "current",
      current_calculation: {
        holidays_applied: ["2026-09-07T00:00:00Z", "2026-09-10"],
      },
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
      "Feriado ou suspensão",
      "Feriado ou suspensão",
    ]);
    expect(
      feriadosVigentes({ ...p, calculation_audit_status: "historical" }),
    ).toEqual([]);
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
  // Caso real 018f8dd1: deadline OPEN, tipo_ato='indeterminado', selo='a_apurar'
  // (piso supletivo CPC 218§3), confirmacao_exigida=true, 0 action_items.
  // EXCEÇÃO DE CLASSIFICAÇÃO — não "Revisão pendente" genérico (que soava como
  // alarme sem causa) nem "Sem pendência" cosmético (a exceção é real).
  it("prazo assumido pelo piso supletivo com tipo indeterminado → causa específica, nunca genérica nem cosmética", () => {
    const p = {
      status: "OPEN",
      tipo_ato: "indeterminado",
      selo: "a_apurar",
      confirmacao_exigida: true,
      confirmed: false,
    } as PrazoDetalheView;
    expect(situacaoRevisao(p, "manual")).toEqual({
      label: "Tipo do ato não identificado",
      pendente: true,
    });
  });

  it("selo='a_apurar' sem tipo indeterminado → NÃO usa a causa de classificação (não é esse padrão)", () => {
    const p = {
      status: "OPEN",
      tipo_ato: "apelacao",
      selo: "a_apurar",
      confirmacao_exigida: true,
      confirmed: false,
    } as PrazoDetalheView;
    expect(situacaoRevisao(p, "manual").label).not.toBe(
      "Tipo do ato não identificado",
    );
  });

  it("tipo indeterminado com selo='confiavel' (não é o padrão supletivo/a_apurar) → NÃO usa a causa de classificação", () => {
    const p = {
      status: "OPEN",
      tipo_ato: "indeterminado",
      selo: "confiavel",
      confirmacao_exigida: true,
      confirmed: false,
    } as PrazoDetalheView;
    expect(situacaoRevisao(p, "manual").label).not.toBe(
      "Tipo do ato não identificado",
    );
  });

  // Pós-Confirm (018f8dd1 resolvido): BE a89 corrige `provisorio=false` e o
  // Confirm real grava `tipo_ato` válido + `selo='confiavel'` + `confirmed_by`.
  // `origem` continua HISTÓRICO ("supletivo" no payload real do BE) — este
  // predicado nunca leu `origem` (só `selo`+`tipo_ato`), então não importa que
  // ele permaneça "supletivo" para sempre; a causa/pendência têm de sumir
  // porque as condições reais (`selo`, `tipo_ato`) mudaram, não porque
  // fingimos que a origem histórica virou outra coisa.
  it("pós-Confirm (tipo válido, selo='confiavel', confirmed) → motivo específico NÃO trava, mesmo com origem historicamente supletiva", () => {
    const pos = {
      status: "OPEN",
      tipo_ato: "apelacao",
      selo: "confiavel",
      confirmacao_exigida: false,
      confirmed: true,
      confirmed_by_name: "Dra. Fulana",
      confirmed_at: "2026-09-23T10:00:00Z",
      // origem permanece histórica no BE real ("supletivo") — não modelado
      // aqui de propósito: o predicado não lê `origem`, então omiti-lo prova
      // que o resultado não depende dele.
    } as PrazoDetalheView;
    const r = situacaoRevisao(pos, "manual");
    expect(r.label).not.toBe("Tipo do ato não identificado");
    expect(r.pendente).toBe(false);
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
