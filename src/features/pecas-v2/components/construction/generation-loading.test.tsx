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

  // ITEM 9 — a tela prometia "os autos do processo" e a etapa "Consultando os
  // autos · Localizando peças e provas do processo" mesmo quando o processo não
  // tem autos, logo depois do gate avisar "Processo sem autos carregados". A
  // promessa tem que casar com o que existe.
  describe("promessa de autos condicionada à existência real", () => {
    const render = (hasAutos: boolean) =>
      renderToStaticMarkup(
        createElement(GenerationLoading, {
          phase: 3,
          connectionError: false,
          hasAutos,
        }),
      );

    it("processo SEM autos não promete autos em lugar nenhum", () => {
      const html = render(false);
      expect(html).not.toContain("os autos do processo");
      expect(html).not.toContain("Consultando os autos");
      expect(html).not.toContain("Localizando peças e provas do processo");
    });

    it("processo SEM autos nomeia as fontes que de fato existem", () => {
      const html = render(false);
      expect(html).toContain("Reunimos as teses e o contexto do processo");
      expect(html).toContain("Conferindo as fontes");
      expect(html).toContain("Teor da publicação e anexos disponíveis");
    });

    it("processo COM autos mantém a copy original", () => {
      const html = render(true);
      expect(html).toContain("Reunimos as teses e os autos do processo");
      expect(html).toContain("Consultando os autos");
    });

    it("as 4 etapas continuam existindo nos dois casos (espelham stages reais)", () => {
      expect(render(false).match(/<li [^>]*>/g) ?? []).toHaveLength(4);
      expect(render(true).match(/<li [^>]*>/g) ?? []).toHaveLength(4);
    });

    it("default é COM autos — nenhum chamador existente muda de comportamento", () => {
      const html = renderToStaticMarkup(
        createElement(GenerationLoading, { phase: 3, connectionError: false }),
      );
      expect(html).toContain("Consultando os autos");
    });
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
