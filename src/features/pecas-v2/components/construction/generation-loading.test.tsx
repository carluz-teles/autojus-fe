import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GenerationLoading } from "./generation-loading";

describe("Preparação antes da escrita", () => {
  it.each([
    ["loading_context", "Reunindo o contexto"],
    ["retrieving_sources", "Analisando autos e fundamentos"],
    ["analyzing_sources", "Analisando autos e fundamentos"],
    ["drafting_sections", "Preparando a redação"],
  ])("%s mostra a etapa real sem prometer uma minuta pronta", (stage, step) => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, { stage, connectionError: false }),
    );
    expect(html).toContain('aria-label="Etapas de preparação"');
    expect(html.match(/<li\b/g)).toHaveLength(3);
    expect(html).toMatch(
      new RegExp(`aria-current="step">[\\s\\S]*?</svg>${step}`),
    );
    expect(html).not.toContain("Redigindo a minuta");
    expect(html).not.toContain("Conferindo o texto");
  });

  it("só anuncia auditoria quando o backend a informa", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        stage: "auditing_draft",
        connectionError: false,
      }),
    );
    expect(html).toContain(
      "Conferindo a minuta antes de disponibilizar o texto",
    );
  });

  it("explica a desconexão sem afirmar que a geração falhou", () => {
    const html = renderToStaticMarkup(
      createElement(GenerationLoading, {
        stage: "waiting",
        connectionError: true,
      }),
    );
    expect(html).toContain("A geração pode continuar");
    expect(html).not.toContain('aria-current="step"');
  });
});
