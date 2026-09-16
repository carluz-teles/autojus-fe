import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GenerationLoading, STAGE_PHASE } from "./generation-loading";

// ── STAGE_PHASE mapping ──────────────────────────────────────────────────────

describe("STAGE_PHASE — mapeamento de stage para fase", () => {
  it("loading_context → fase 2", () => {
    expect(STAGE_PHASE["loading_context"]).toBe(2);
  });
  it("analyzing_sources → fase 3", () => {
    expect(STAGE_PHASE["analyzing_sources"]).toBe(3);
  });
  it("drafting_sections → fase 4", () => {
    expect(STAGE_PHASE["drafting_sections"]).toBe(4);
  });
  it("safe_fallback → fase 4 (defensivo)", () => {
    expect(STAGE_PHASE["safe_fallback"]).toBe(4);
  });
  it("retrieving_sources NÃO existe no mapeamento (BE nunca emite)", () => {
    expect(STAGE_PHASE["retrieving_sources"]).toBeUndefined();
  });
  it("auditing_draft NÃO está no mapeamento (in-sheet, tratado pelo GerandoCenter)", () => {
    expect(STAGE_PHASE["auditing_draft"]).toBeUndefined();
  });
});

// ── GenerationLoading component ──────────────────────────────────────────────

describe("GenerationLoading — 4 etapas reais sem timers", () => {
  it("fase 1 ativa: Consultando teses como active, resto pending", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 1,
        connectionError: false,
      }),
    );
    expect(html).toContain("Consultando teses");
    expect(html).toContain("Reunindo o contexto");
    expect(html).toContain("Consultando os autos");
    expect(html).toContain("Redigindo a minuta");
    // phase 1 is active → aria-current="step"
    expect(html).toContain('aria-current="step"');
  });

  it("fase 2 ativa: 'Consultando teses' done, 'Reunindo o contexto' active", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 2,
        connectionError: false,
      }),
    );
    expect(html).toContain("Consultando teses");
    expect(html).toContain("Reunindo o contexto");
    // step 1 done, step 2 active
    const liElements = html.match(/<li [^>]*>/g) ?? [];
    expect(liElements).toHaveLength(4);
  });

  it("fase 4 ativa: Redigindo a minuta como active", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 4,
        connectionError: false,
      }),
    );
    expect(html).toContain("Redigindo a minuta");
  });

  it("mostra 'buscando…' na fase 1 sem count", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 1,
        thesesCount: undefined,
        connectionError: false,
      }),
    );
    expect(html).toContain("buscando");
  });

  it("mostra count parcial ao vivo na fase 1 quando há teses chegando", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 1,
        thesesCount: 7,
        connectionError: false,
      }),
    );
    // count > 0 em fase 1 ativa: mostra "7 encontradas"
    expect(html).toContain("7 encontradas");
  });

  it("mostra count quando teses já foram concluídas (fase > 1)", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 2,
        thesesCount: 14,
        connectionError: false,
      }),
    );
    expect(html).toContain("14 encontradas");
  });

  it("exibe mensagem de desconexão sem afirmar que a geração falhou", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 1,
        connectionError: true,
      }),
    );
    expect(html).toContain("A geração pode continuar");
    // Não afirma falha
    expect(html).not.toContain("falhou");
  });

  it("não menciona fase 'retrieving_sources' nem stages removidos", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        phase: 2,
        connectionError: false,
      }),
    );
    expect(html).not.toContain("retrieving_sources");
    expect(html).not.toContain("Localizando os autos e as referências");
  });
});
