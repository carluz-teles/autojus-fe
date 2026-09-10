import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PecaContextoDoc } from "../../lib/peca-contexto";
import { PreparationSources } from "./preparation-sources";

const documents: PecaContextoDoc[] = Array.from({ length: 6 }, (_, index) => ({
  id: String(index),
  name: `Petição ${index + 1}`,
  meta: "26/08/2026 · 2 pág.",
  category: "Autos",
  status: "READY",
}));
const render = (docs: PecaContextoDoc[], hasIntimation = true) =>
  renderToStaticMarkup(
    <PreparationSources
      documents={docs}
      hasIntimation={hasIntimation}
      publishedAt="21/08/2026"
      onOpenIntimation={() => {}}
      onOpenDocument={() => {}}
    />,
  );

describe("PreparationSources", () => {
  it("shows only four documents initially, with metadata and an accessible expansion control", () => {
    const html = render(documents);
    expect(html).toContain("Petição 4");
    expect(html).not.toContain("Petição 5");
    expect(html).toContain("26/08/2026 · 2 pág.");
    expect(html).toContain("Ver todos os 6 documentos");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("aria-controls=");
  });
  it("deduplicates documents without hiding separate documents of the same type", () => {
    const html = render([
      documents[0],
      documents[0],
      { ...documents[1], name: documents[0].name },
    ]);
    expect(html).toContain("2 documentos");
    expect(html.match(/aria-label="Abrir Petição 1/g)).toHaveLength(2);
    expect(html).not.toContain("Ver todos");
  });
  it("keeps origin date and clearly identifies unavailable documents", () => {
    const html = render([{ ...documents[0], status: "FAILED" }], false);
    expect(html).toContain("Teor ainda indisponível");
    expect(html).toContain("Falha no processamento");
    expect(html.match(/ disabled=""/g)).toHaveLength(2);
    expect(render([])).toContain("21/08/2026");
  });
  it("provides an empty state instead of an empty list", () => {
    const html = render([]);
    expect(html).toContain("Nenhum auto disponível");
    expect(html).not.toContain("<ul");
  });
});
