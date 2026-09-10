// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ORIGEM_DESCRICAO } from "@/features/triagem/lib/origem";

import { FilterTabs } from "../shared/filter-tabs";
import { RevisaoOrigem } from "./revisao-origem";

describe("RevisaoOrigem", () => {
  it("destaca a revisão antes da origem, com explicações acessíveis por teclado", () => {
    const html = renderToStaticMarkup(
      <RevisaoOrigem
        revisao={{
          label: "Revisar tipo e prazo",
          pending: true,
          description: "A confirmar: revise antes de confirmar.",
        }}
        origem="Inferido"
        origemDescricao={ORIGEM_DESCRICAO.ia}
      />,
    );
    expect(html.indexOf("Revisar tipo e prazo")).toBeLessThan(
      html.indexOf("Origem:"),
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain('data-variant="warning"');
    expect(html).toContain('aria-label="Entender: Revisar tipo e prazo"');
  });
  it("não cria alerta nem botão de revisão para um prazo já revisado", () => {
    const html = renderToStaticMarkup(
      <RevisaoOrigem
        revisao={{ label: "Prazo revisado", pending: false }}
        origem="Calculado"
      />,
    );
    expect(html).toContain("Prazo revisado");
    expect(html).toContain("Calculado");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('data-variant="warning"');
  });
  it("mantém o filtro Inferido como um único botão com contagem e explicação", () => {
    const html = renderToStaticMarkup(
      <FilterTabs
        label="Origem do prazo"
        tabs={[
          {
            key: "ia",
            label: "Inferido",
            count: 7,
            ativo: true,
            onClick: () => {},
            description: ORIGEM_DESCRICAO.ia,
          },
        ]}
      />,
    );
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Inferido");
    expect(html).toContain(">7</span>");
  });
  it("abre a explicação ao focar e fecha com Escape, sem confirmar nada", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <RevisaoOrigem
            revisao={{
              label: "Revisar tipo e prazo",
              pending: true,
              description: "A confirmar: revise antes de confirmar.",
            }}
            origem="Inferido"
            origemDescricao={ORIGEM_DESCRICAO.ia}
          />,
        ),
      );
      const buttons = container.querySelectorAll("button");
      for (const [index, text] of [
        "A confirmar: revise antes de confirmar.",
        ORIGEM_DESCRICAO.ia!,
      ].entries()) {
        await act(async () => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
          );
          buttons[index].focus();
        });
        expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
          text,
        );
        expect(buttons[index].getAttribute("aria-describedby")).toBe(
          document.querySelector('[role="tooltip"]')?.id,
        );
        await act(async () => {
          buttons[index].dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
          buttons[index].blur();
        });
        expect(buttons[index].hasAttribute("aria-describedby")).toBe(false);
      }
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});
