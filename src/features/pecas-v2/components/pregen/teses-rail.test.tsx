import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Thesis } from "../../types";
import { TesesRail } from "./teses-rail";

const thesis: Thesis = {
  id: "thesis-1",
  label: "Fundamento sugerido",
  foundation: "Argumentação a revisar.",
  legalRef: "",
  sourceDocumentId: "",
  sourceLabel: "",
  sourceExcerpt: "",
  anchors: [],
  segments: [],
  grounded: false,
  state: "off",
  position: 0,
};

const render = (overrides: Partial<Thesis> = {}) =>
  renderToStaticMarkup(
    <TesesRail
      theses={[{ ...thesis, ...overrides }]}
      selectedCount={0}
      isLoading={false}
      isError={false}
      isRegenerating={false}
      teorSourceId="origin-1"
      onToggle={() => {}}
      onFonte={() => {}}
    />,
  );

describe("TesesRail citations", () => {
  it.each(["", "   "])(
    "explains a missing citation (%j) without an empty quote",
    (sourceExcerpt) => {
      const html = render({ sourceExcerpt });
      expect(html).toContain(
        "Nenhum trecho literal validado para este fundamento.",
      );
      expect(html).not.toContain("<blockquote");
      expect(html).toContain('aria-label="Abrir intimação de origem"');
    },
  );

  it("shows a recovered intimation quote", () => {
    const html = render({
      sourceExcerpt: "Sob pena de extinção e arquivamento da demanda.",
      sourceLabel: "Intimação de origem",
      grounded: true,
    });
    expect(html).toContain("<blockquote");
    expect(html).toContain("Sob pena de extinção e arquivamento da demanda.");
    expect(html).not.toContain("Nenhum trecho literal validado");
  });

  it("handles each document anchor independently", () => {
    const html = render({
      anchors: [
        {
          documentId: "doc-1",
          label: "Petição",
          excerpt: "Pesquisa requerida.",
          page: 2,
          grounded: true,
        },
        {
          documentId: "doc-2",
          label: "Despacho",
          excerpt: "",
          page: 1,
          grounded: false,
        },
      ],
    });
    expect(html.match(/<blockquote/g)).toHaveLength(1);
    expect(html).toContain("Pesquisa requerida.");
    expect(html).toContain("Nenhum trecho literal validado");
    expect(html).toContain('aria-label="Abrir Despacho, página 1"');
  });
});
