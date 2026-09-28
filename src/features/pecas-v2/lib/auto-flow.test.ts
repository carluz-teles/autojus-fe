import { describe, expect, it } from "vitest";

import {
  decidirAcaoAuto,
  decidirAcaoRetry,
  derivarTelaConstrucao,
  type TesesEstado,
} from "./auto-flow";

const base = {
  hasOrigin: true,
  hasTeor: true,
  stage: "pregen" as const,
  hasContent: false,
  autoFailed: false,
};

describe("derivarTelaConstrucao — fluxo único, sem wizard de teses (nem como recuperação)", () => {
  it("sem intimação de origem → 'sem-origem' (gate real, não pulado)", () => {
    expect(derivarTelaConstrucao({ ...base, hasOrigin: false })).toBe(
      "sem-origem",
    );
  });

  it("sem teor → 'sem-teor' (gate real, não pulado) — mesmo com origem presente", () => {
    expect(derivarTelaConstrucao({ ...base, hasTeor: false })).toBe("sem-teor");
  });

  it("rascunho fresco (pregen, sem conteúdo, sem falha) → 'carregando', NUNCA um wizard — regressão do bug real (entrada sem `?auto=1`)", () => {
    // Este é exatamente o caso do bug relatado: reabrir um rascunho ainda não
    // gerado a partir de uma lista/link que não carrega `auto=1`
    // (`use-processo-hub.ts:208`, `href: /pecas/${d.id}`, sem query). A
    // decisão agora não lê nenhum parâmetro de URL — só o estado real.
    expect(derivarTelaConstrucao(base)).toBe("carregando");
  });

  it("saga em geração (stage='gerando') → 'carregando'", () => {
    expect(derivarTelaConstrucao({ ...base, stage: "gerando" })).toBe(
      "carregando",
    );
  });

  it("autoFailed=true sem conteúdo → 'falha' (erro limpo + retry), nunca o wizard de recuperação manual", () => {
    expect(
      derivarTelaConstrucao({ ...base, stage: "falha", autoFailed: true }),
    ).toBe("falha");
  });

  it("falha SSE pós-202 detectada por polling (stage='falha' vindo do saga_state, sem a sessão ter marcado autoFailed local) → ainda assim 'falha', nunca 'carregando' infinito nem wizard", () => {
    // autoFailed (flag local, setado só pelo onError da PRÓPRIA mutation)
    // continua false aqui de propósito — a falha chegou via saga_state
    // (polling), não pela sessão atual. `stage` já reflete isso.
    expect(
      derivarTelaConstrucao({ ...base, stage: "falha", autoFailed: false }),
    ).toBe("falha");
  });

  it("stage='falha' MAS com conteúdo preservado (regeração falhou, minuta anterior existe) → 'pronta' (workbench, não a tela de erro cheia nem o wizard)", () => {
    expect(
      derivarTelaConstrucao({
        ...base,
        stage: "falha",
        hasContent: true,
        autoFailed: true,
      }),
    ).toBe("pronta");
  });

  it("stage='pronta' → 'pronta'", () => {
    expect(derivarTelaConstrucao({ ...base, stage: "pronta" })).toBe("pronta");
  });

  it("não gera de novo conteúdo já existente: 'pronta' vence mesmo se autoFailed estivesse (defensivamente) true", () => {
    expect(
      derivarTelaConstrucao({
        ...base,
        stage: "pronta",
        hasContent: true,
        autoFailed: true,
      }),
    ).toBe("pronta");
  });

  it("gates (sem-origem/sem-teor) têm prioridade sobre falha/carregando — nunca pulados", () => {
    expect(
      derivarTelaConstrucao({
        ...base,
        hasOrigin: false,
        stage: "falha",
        autoFailed: true,
      }),
    ).toBe("sem-origem");
    expect(
      derivarTelaConstrucao({
        ...base,
        hasTeor: false,
        stage: "gerando",
      }),
    ).toBe("sem-teor");
  });
});

function teses(over: Partial<TesesEstado> = {}): TesesEstado {
  return {
    theses: [],
    isLoading: false,
    isError: false,
    isRegenerating: false,
    isTogglingId: null,
    ...over,
  };
}

const acaoBase = {
  hasOrigin: true,
  hasTeor: true,
  saga: "CREATED",
  hasContent: false,
  firedGenerate: false,
  settled: false,
};

describe("decidirAcaoAuto — disparo automático real, sem fingir saga", () => {
  it("sem origem/teor → esperar (gates reais, nunca dispara)", () => {
    expect(
      decidirAcaoAuto({ ...acaoBase, hasOrigin: false, theses: teses() }),
    ).toEqual({ tipo: "esperar" });
    expect(
      decidirAcaoAuto({ ...acaoBase, hasTeor: false, theses: teses() }),
    ).toEqual({ tipo: "esperar" });
  });

  it("saga !== CREATED (ex.: já FAILED/EXTRACTING) → esperar (nunca finge saga)", () => {
    expect(
      decidirAcaoAuto({ ...acaoBase, saga: "FAILED", theses: teses() }),
    ).toEqual({ tipo: "esperar" });
  });

  it("já tem conteúdo ou já disparou nesta sessão → esperar (não gera de novo)", () => {
    expect(
      decidirAcaoAuto({ ...acaoBase, hasContent: true, theses: teses() }),
    ).toEqual({ tipo: "esperar" });
    expect(
      decidirAcaoAuto({ ...acaoBase, firedGenerate: true, theses: teses() }),
    ).toEqual({ tipo: "esperar" });
  });

  it("theses.isError → falhar (imediato, não espera settled)", () => {
    expect(
      decidirAcaoAuto({ ...acaoBase, theses: teses({ isError: true }) }),
    ).toEqual({ tipo: "falhar" });
  });

  it("teses carregando/regenerando/togglando → esperar", () => {
    expect(
      decidirAcaoAuto({ ...acaoBase, theses: teses({ isLoading: true }) }),
    ).toEqual({ tipo: "esperar" });
    expect(
      decidirAcaoAuto({
        ...acaoBase,
        theses: teses({ isRegenerating: true }),
      }),
    ).toEqual({ tipo: "esperar" });
    expect(
      decidirAcaoAuto({
        ...acaoBase,
        theses: teses({ isTogglingId: "t1" }),
      }),
    ).toEqual({ tipo: "esperar" });
  });

  it("lista vazia mas AINDA NÃO settled (1ª renderização, stream ainda não concluiu) → esperar, nunca falha prematura", () => {
    expect(
      decidirAcaoAuto({
        ...acaoBase,
        settled: false,
        theses: teses({ theses: [] }),
      }),
    ).toEqual({ tipo: "esperar" });
  });

  it("lista vazia E settled (stream/fallback concluíram, zero fundamentos) → falhar — regressão do loader infinito relatado pelo root", () => {
    expect(
      decidirAcaoAuto({
        ...acaoBase,
        settled: true,
        theses: teses({ theses: [] }),
      }),
    ).toEqual({ tipo: "falhar" });
  });

  it("teses populadas → gerar com os ids reais", () => {
    expect(
      decidirAcaoAuto({
        ...acaoBase,
        theses: teses({ theses: [{ id: "t1" }, { id: "t2" }] }),
      }),
    ).toEqual({ tipo: "gerar", thesisIds: ["t1", "t2"] });
  });
});

describe("decidirAcaoRetry — 'Tentar de novo' chama a mutation canônica direto, nunca só reseta flags", () => {
  it("teses com erro → regerar-teses (não tenta gerar com lista quebrada)", () => {
    expect(decidirAcaoRetry({ theses: teses({ isError: true }) })).toEqual({
      tipo: "regerar-teses",
    });
  });

  it("teses vazias (mesmo sem erro explícito) → regerar-teses", () => {
    expect(decidirAcaoRetry({ theses: teses({ theses: [] }) })).toEqual({
      tipo: "regerar-teses",
    });
  });

  it("teses OK (populadas, sem erro) → gerar direto, reusa a lista existente (não gasta uma nova consulta de teses à toa)", () => {
    expect(
      decidirAcaoRetry({ theses: teses({ theses: [{ id: "t1" }] }) }),
    ).toEqual({ tipo: "gerar" });
  });
});
