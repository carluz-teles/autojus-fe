// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MasterDetailLayout } from "./master-detail";

describe("MasterDetailLayout", () => {
  it("sem painel: só a lista, largura cheia", () => {
    const html = renderToStaticMarkup(
      <MasterDetailLayout painel={null}>
        <div>lista</div>
      </MasterDetailLayout>,
    );
    expect(html).toContain("lista");
    expect(html).not.toContain("painel-conteudo");
  });

  it("monta uma única prévia e preserva o scrollport da lista", () => {
    const html = renderToStaticMarkup(
      <MasterDetailLayout
        painel={<div data-testid="painel-conteudo">detalhe</div>}
      >
        <div>lista</div>
      </MasterDetailLayout>,
    );
    expect(html).toContain("lista");
    expect(html.match(/painel-conteudo/g)).toHaveLength(1);
    expect(html.match(/data-slot="page-content"/g)).toHaveLength(1);
    expect(html).toContain("hidden lg:block");
    expect(html).toContain('data-slot="workspace-preview"');
  });
});
