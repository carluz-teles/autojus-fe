import { describe, expect, it } from "vitest";

import {
  capturaEmAndamento,
  dispRefineFromLegacySegmento,
  resolveDispTabERefine,
  somaMatrizPorStatus,
  STATUS_LIFECYCLE_WIRE,
  statusFromLegacyTab,
} from "./use-triagem-pipeline";

function celula(total: number) {
  return {
    total,
    analisando: total,
    trabalho: total,
    excecao: total,
    ciencia: total,
    sem_prazo: total,
  };
}

const MATRIX = {
  a_triar: celula(1),
  em_andamento: celula(10),
  concluido: celula(100),
};

// Adapter de compat de URL legada (docs/navigation-architecture.md — CONTRATO
// ROOT §4): deep-links salvos com ?tab=/?segmento= continuam funcionando depois
// da inversão de eixos (tabs=disposição, status=lifecycle).
describe("statusFromLegacyTab", () => {
  it("mapeia as 3 lanes antigas para o novo status", () => {
    expect(statusFromLegacyTab("a_triar")).toBe("a_decidir");
    expect(statusFromLegacyTab("em_andamento")).toBe("em_andamento");
    expect(statusFromLegacyTab("concluido")).toBe("encerradas");
  });

  it("retorna null para valor desconhecido/ausente (cai no default 'abertas')", () => {
    expect(statusFromLegacyTab("")).toBeNull();
    expect(statusFromLegacyTab("lixo")).toBeNull();
  });
});

describe("dispRefineFromLegacySegmento", () => {
  it("mapeia os segmentos reais para a aba de disposição", () => {
    expect(dispRefineFromLegacySegmento("trabalhar")).toEqual({
      dispTab: "trabalho",
      refine: "",
    });
    expect(dispRefineFromLegacySegmento("excecoes")).toEqual({
      dispTab: "excecao",
      refine: "",
    });
    expect(dispRefineFromLegacySegmento("ciencia")).toEqual({
      dispTab: "ciencia",
      refine: "",
    });
    expect(dispRefineFromLegacySegmento("all")).toEqual({
      dispTab: "",
      refine: "",
    });
  });

  it("mapeia os segmentos transientes/residuais para o refinamento dentro de Todas", () => {
    expect(dispRefineFromLegacySegmento("sem-prazo")).toEqual({
      dispTab: "",
      refine: "sem_prazo",
    });
    expect(dispRefineFromLegacySegmento("analisando")).toEqual({
      dispTab: "",
      refine: "analisando",
    });
  });

  it("retorna null para valor desconhecido", () => {
    expect(dispRefineFromLegacySegmento("lixo")).toBeNull();
  });
});

// BUG real corrigido: url.get() devolve "" tanto pra chave ausente quanto
// presente-vazia, e "" ∈ DISP_TABS/REFINES fazia o antigo `.includes()` casar
// mesmo com a chave AUSENTE — o fallback legado nunca era alcançado. Estes
// testes exercitam exatamente as combinações reais de searchParams (sem
// harness de URL/React), com a precedência: novo explícito > legado > default.
describe("resolveDispTabERefine — precedência novo × legado × default", () => {
  it("tab=a_triar&segmento=excecoes → aba Exceções", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "a_triar",
        legacySegmento: "excecoes",
      }),
    ).toEqual({ dispTab: "excecao", refine: "" });
  });

  it("tab=a_triar&segmento=sem-prazo → refine sem_prazo dentro de Todas", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "a_triar",
        legacySegmento: "sem-prazo",
      }),
    ).toEqual({ dispTab: "", refine: "sem_prazo" });
  });

  it("tab=a_triar&segmento=analisando → refine analisando dentro de Todas", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "a_triar",
        legacySegmento: "analisando",
      }),
    ).toEqual({ dispTab: "", refine: "analisando" });
  });

  it("segmento ausente (e tab ausente) → Todas, sem refinamento", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "",
        legacySegmento: "",
      }),
    ).toEqual({ dispTab: "", refine: "" });
  });

  it("?disposicao= explícita prevalece sobre qualquer segmento legado", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "trabalho",
        refineFromUrl: "",
        legacyTab: "a_triar",
        legacySegmento: "excecoes",
      }),
    ).toEqual({ dispTab: "trabalho", refine: "" });
  });

  it("?refine= explícita prevalece sobre segmento legado", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "analisando",
        legacyTab: "a_triar",
        legacySegmento: "excecoes",
      }),
    ).toEqual({ dispTab: "", refine: "analisando" });
  });

  it('?disposicao="" explícito (usuário voltou pra Todas) limpa o legado — não ressuscita segmento', () => {
    // setDispTab("") já apaga `segmento` da URL (ver setDispTab), então na
    // prática legacySegmento chega vazio aqui — mas mesmo que sobrevivesse
    // (bookmark antigo editado à mão), o resultado tem que ser Todas.
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "a_triar",
        legacySegmento: "",
      }),
    ).toEqual({ dispTab: "", refine: "" });
  });

  it("segmento stale sobrevive na URL mas tab antigo era em_andamento/concluido → NÃO ressuscita (antigo só aplicava em a_triar)", () => {
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "em_andamento",
        legacySegmento: "excecoes",
      }),
    ).toEqual({ dispTab: "", refine: "" });
    expect(
      resolveDispTabERefine({
        dispFromUrl: "",
        refineFromUrl: "",
        legacyTab: "concluido",
        legacySegmento: "trabalhar",
      }),
    ).toEqual({ dispTab: "", refine: "" });
  });
});

// CONTRATO BE (mesma entrega, a89a4e): "abertas" e "todas" são valores de wire
// que o SERVIDOR resolve — a lista NUNCA concatena páginas client-side.
describe("STATUS_LIFECYCLE_WIRE", () => {
  it("envia 'abertas' e 'todas' como valores de wire (o BE resolve a união)", () => {
    expect(STATUS_LIFECYCLE_WIRE.abertas).toBe("abertas");
    expect(STATUS_LIFECYCLE_WIRE.todas).toBe("");
  });

  it("mapeia os status de lane única 1:1 pro lifecycle existente", () => {
    expect(STATUS_LIFECYCLE_WIRE.a_decidir).toBe("a_triar");
    expect(STATUS_LIFECYCLE_WIRE.em_andamento).toBe("em_andamento");
    expect(STATUS_LIFECYCLE_WIRE.encerradas).toBe("concluido");
  });
});

// Adapter de counts: badges SEMPRE vêm da matriz by_lifecycle somada sobre as
// lanes do status ativo — nunca inferidos/consultados por fora dela.
describe("somaMatrizPorStatus", () => {
  it("undefined (loading/sem número) quando a matriz ainda não chegou", () => {
    expect(
      somaMatrizPorStatus(undefined, "abertas", "trabalho"),
    ).toBeUndefined();
    expect(somaMatrizPorStatus(undefined, "todas", "total")).toBeUndefined();
  });

  it("a_decidir/em_andamento/encerradas somam só a própria lane", () => {
    expect(somaMatrizPorStatus(MATRIX, "a_decidir", "trabalho")).toBe(1);
    expect(somaMatrizPorStatus(MATRIX, "em_andamento", "trabalho")).toBe(10);
    expect(somaMatrizPorStatus(MATRIX, "encerradas", "trabalho")).toBe(100);
  });

  it("abertas soma a_triar+em_andamento (nunca concluido)", () => {
    expect(somaMatrizPorStatus(MATRIX, "abertas", "trabalho")).toBe(11);
  });

  it("todas soma as 3 lanes", () => {
    expect(somaMatrizPorStatus(MATRIX, "todas", "trabalho")).toBe(111);
  });
});

// S2 (docs/qa-remediation-evidence/fe-operations-architecture.md): sinal REAL de
// captura em andamento — o mesmo predicado liga E desliga o refetch bounded da
// Mesa (list/counts), nunca um polling permanente nem um estado inventado.
describe("capturaEmAndamento — ativação/terminal do refetch bounded (S2)", () => {
  it("ativa quando alguma run está 'Em andamento'", () => {
    expect(
      capturaEmAndamento([
        { display_status: "Concluída" },
        { display_status: "Em andamento" },
      ]),
    ).toBe(true);
  });

  it("desliga (auto-off) quando nenhuma run está mais 'Em andamento' — terminal real", () => {
    expect(
      capturaEmAndamento([
        { display_status: "Concluída" },
        { display_status: "Falha parcial" },
      ]),
    ).toBe(false);
  });

  it("sem nenhuma run (lista vazia) → desligado, nunca liga por ausência de dado", () => {
    expect(capturaEmAndamento([])).toBe(false);
  });

  it("dado ainda não carregado (undefined, 1º render) → desligado, nunca liga sem sinal real", () => {
    expect(capturaEmAndamento(undefined)).toBe(false);
  });
});
