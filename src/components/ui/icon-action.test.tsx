import { Eye } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IconAction } from "./icon-action";

describe("IconAction", () => {
  it("mantém o nome acessível sem texto visual no botão", () => {
    const html = renderToStaticMarkup(
      createElement(IconAction, { icon: Eye, label: "Abrir documento" }),
    );
    expect(html).toContain('aria-label="Abrir documento"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain(">Abrir documento<");
  });
  it.each([{ disabled: true }, { loading: true }])(
    "bloqueia a ação durante indisponibilidade ou carregamento: %j",
    (props) => {
      const html = renderToStaticMarkup(
        createElement(IconAction, {
          icon: Eye,
          label: "Abrir documento",
          ...props,
        }),
      );
      expect(html).toContain('aria-disabled="true"');
      if ("loading" in props) expect(html).toContain('aria-busy="true"');
    },
  );
});
