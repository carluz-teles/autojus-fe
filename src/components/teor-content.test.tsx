import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeorContent } from "./teor-content";

function render(content: string | null, allowLinks = true) {
  return renderToStaticMarkup(
    createElement(TeorContent, { content, allowLinks }),
  );
}

describe("TeorContent", () => {
  it("formata documentos HTML de tribunal com parágrafos, entidades, listas e partes", () => {
    const output =
      render(`<!DOCTYPE html><html><head><style>body{display:none}</style></head>
      <body><article><section><p>Intima&ccedil;&atilde;o <strong>publicada</strong></p>
      <table><tr><td>EXEQUENTE:</td><td>Maria</td></tr></table>
      <ol><li>Apresentar documento</li></ol></section></article></body></html>`);
    expect(output).toContain("prose-intimacao");
    expect(output).toContain("Intimação <strong>publicada</strong>");
    expect(output).toContain("<td>EXEQUENTE:</td>");
    expect(output).toContain("<ol><li>Apresentar documento</li></ol>");
    expect(output).not.toContain("<style>");
    expect(output).not.toContain("&lt;article&gt;");
  });

  it("escapa texto puro e preserva suas quebras de linha", () => {
    const output = render(
      "Valor < 100 & prazo > 5.\n\nApresentar manifestação.",
    );
    expect(output).toContain("whitespace-pre-wrap");
    expect(output).toContain(
      "Valor &lt; 100 &amp; prazo &gt; 5.\n\nApresentar manifestação.",
    );
  });

  it("remove conteúdo executável, eventos, estilos e URLs perigosas", () => {
    const output = render(
      '<p onclick="alert(1)" style="position:fixed">Teor</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">Origem</a><iframe src="https://example.com"></iframe>',
    );
    expect(output).toContain("<p>Teor</p>");
    expect(output).not.toMatch(
      /onclick|onerror|javascript:|<script|<img|<iframe|position:fixed|alert\(1\)/,
    );
  });

  it("abre links seguros em nova aba", () => {
    const output = render(
      '<a href="https://example.com/documento">Documento</a>',
    );
    expect(output).toContain('href="https://example.com/documento"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("remove links em trechos dentro de linhas clicáveis preservando o texto", () => {
    const output = render(
      '<p>Leia o <a href="https://example.com">documento</a>.</p>',
      false,
    );
    expect(output).toContain("<p>Leia o documento.</p>");
    expect(output).not.toContain("<a ");
  });

  it.each([null, "", "   ", "<p><br>&nbsp;</p>", "<script>alert(1)</script>"])(
    "exibe o estado vazio para %s",
    (input) => expect(render(input)).toContain("Teor integral indisponível."),
  );

  it("permite a mensagem de ausência específica do contexto", () => {
    const output = renderToStaticMarkup(
      createElement(TeorContent, {
        content: null,
        emptyMessage: "Consulte a intimação de origem.",
      }),
    );
    expect(output).toContain("Consulte a intimação de origem.");
  });
});
