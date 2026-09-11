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

const renderStreaming = (
  streaming: { active: boolean; count: number } | undefined,
  theses: Thesis[] = [thesis],
) =>
  renderToStaticMarkup(
    <TesesRail
      theses={theses}
      selectedCount={0}
      isLoading={false}
      isError={false}
      isRegenerating={false}
      teorSourceId="origin-1"
      onToggle={() => {}}
      onFonte={() => {}}
      streaming={streaming}
    />,
  );

describe("TesesRail streaming", () => {
  it("shows the live header with count and role=status while streaming", () => {
    const html = renderStreaming({ active: true, count: 3 });
    expect(html).toContain('role="status"');
    expect(html).toContain("Lendo os autos e gerando fundamentos…");
    // Count is rendered with tabular-nums for stable width.
    expect(html).toContain("tabular-nums");
    expect(html).toContain(">3<");
    // The static subtitle must NOT appear while streaming.
    expect(html).not.toContain("citam documentos dos autos");
  });

  it("renders the shimmer ghost while streaming, gone when inactive", () => {
    const streaming = renderStreaming({ active: true, count: 1 });
    expect(streaming).toContain("consultando os autos…");
    const idle = renderStreaming(undefined);
    expect(idle).not.toContain("consultando os autos…");
  });

  it("reveals each card with a motion-safe animation (reduced-motion honored)", () => {
    const html = renderStreaming({ active: true, count: 1 });
    // reveal is gated behind motion-safe: → disabled under prefers-reduced-motion.
    expect(html).toContain("motion-safe:reveal");
    // Spinner + ping also honor motion-reduce.
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("shows the confidence chip mapped from t.confidence", () => {
    const alta = renderStreaming({ active: true, count: 1 }, [
      { ...thesis, confidence: "alta" },
    ]);
    expect(alta).toContain("Alta");
    expect(alta).toContain("text-primary");
    const media = renderStreaming({ active: true, count: 1 }, [
      { ...thesis, confidence: "media" },
    ]);
    expect(media).toContain("Média");
    expect(media).toContain("text-gold-foreground");
  });

  it("reverts to the static subtitle when streaming is inactive", () => {
    const html = renderStreaming(undefined);
    expect(html).toContain("sugestão");
    expect(html).toContain("documentos dos autos");
    expect(html).not.toContain("Lendo os autos e gerando fundamentos…");
  });
});
