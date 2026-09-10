import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { hasActionableFulfillment } from "../lib/fulfillment";
import type { ProvidenciaFulfillment } from "../types";
import { ProvidenciaFulfillment as FulfillmentAlert } from "./providencia-fulfillment";

vi.mock("@/features/documentos/components/pdf-drawer", () => ({
  PdfDrawer: ({ doc }: { doc: { id: string } | null }) =>
    doc ? createElement("div", { "data-pdf-document": doc.id }) : null,
}));

const sources: ProvidenciaFulfillment["sources"] = {
  source_revision: "revision-1",
  scope: "post_intimation_and_undated",
  coverage: "usable",
  reason: "Autos posteriores consultados.",
  checked_at: "2026-09-09T12:00:00Z",
  stale: false,
};

function fulfillment(
  overrides: Partial<ProvidenciaFulfillment> = {},
): ProvidenciaFulfillment {
  return {
    status: "possible_fulfillment",
    reason: "A resposta encontrada pode atender parte da obrigação.",
    obligation_quote: "Comprovar o pagamento no prazo.",
    evidence: [
      {
        document_id: "doc-1",
        title: "Petição de pagamento",
        date: "2026-09-08",
        page: 4,
        quote: "O pagamento foi comprovado nos autos.",
      },
    ],
    sources,
    invalidated: false,
    ...overrides,
  };
}

describe("ProvidenciaFulfillment", () => {
  it("apresenta o aviso e a evidência quando o finding é acionável", () => {
    const finding = fulfillment();
    const html = renderToStaticMarkup(
      <FulfillmentAlert fulfillment={finding} />,
    );
    expect(hasActionableFulfillment(finding)).toBe(true);
    expect(html).toContain("Possível cumprimento nos autos");
    expect(html).toContain(
      "A resposta encontrada pode atender parte da obrigação.",
    );
  });

  it("mostra obrigação, citação e fonte localizável com página", () => {
    const html = renderToStaticMarkup(
      <FulfillmentAlert fulfillment={fulfillment()} />,
    );
    expect(html).toContain("Obrigação analisada");
    expect(html).toContain("O pagamento foi comprovado nos autos.");
    expect(html).toContain("Abrir Petição de pagamento, página 4");
    expect(html).toContain('data-icon="inline-start"');
  });

  it.each([
    ["no_indication", fulfillment({ status: "no_indication", evidence: [] })],
    ["unverified", fulfillment({ status: "unverified", evidence: [] })],
    ["empty evidence", fulfillment({ evidence: [] })],
    ["stale", fulfillment({ sources: { ...sources, stale: true } })],
    ["invalidated", fulfillment({ invalidated: true })],
    [
      "invalid evidence",
      fulfillment({
        evidence: [
          { ...fulfillment().evidence[0], document_id: "", quote: " " },
        ],
      }),
    ],
  ] as const)("não mostra aviso para %s", (_label, finding) => {
    const html = renderToStaticMarkup(
      <FulfillmentAlert fulfillment={finding} />,
    );
    expect(hasActionableFulfillment(finding)).toBe(false);
    expect(html).toBe("");
  });

  it("não repete painel genérico para análise sem metadata", () => {
    const html = renderToStaticMarkup(<FulfillmentAlert fulfillment={null} />);
    expect(html).toBe("");
    expect(html).not.toContain("Limitação da análise dos autos");
  });
});
