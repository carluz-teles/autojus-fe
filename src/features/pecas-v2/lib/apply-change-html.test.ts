// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { applySectionChangeToHtml } from "./apply-change-html";

describe("section proposals", () => {
  it("refuses a proposal after the lawyer edits the target section", () => {
    const html = "<h2>I — FATOS</h2><p>Texto editado.</p>";
    expect(
      applySectionChangeToHtml(html, "I", ["Proposta."], ["Texto original."]),
    ).toBe(html);
  });
  it("preserves paragraph alignment and unchanged emphasis while replacing text", () => {
    const html =
      '<h2>I — FATOS</h2><p style="text-align: justify"><strong>Cliente</strong> apresentou documento antigo.</p><h2>II — PEDIDOS</h2><ol><li>Prosseguimento.</li></ol>';
    const result = applySectionChangeToHtml(
      html,
      "I",
      ["Cliente apresentou documento atualizado."],
      ["Cliente apresentou documento antigo."],
    );
    expect(result).toContain("<strong>Cliente</strong>");
    expect(result).toContain('style="text-align: justify"');
    expect(result).toContain("documento atualizado.");
    expect(result).toContain("<ol><li>Prosseguimento.</li></ol>");
  });
  it("does not flatten a table into paragraphs", () => {
    const html =
      "<h2>I — FATOS</h2><table><tbody><tr><td>Valor</td><td>100</td></tr></tbody></table>";
    expect(applySectionChangeToHtml(html, "I", ["Valor200"])).toBe(html);
  });
});

describe("list section proposals", () => {
  it("accepts current plain list content and preserves numbering and adjacent sections", () => {
    const html =
      '<h2>I — FATOS</h2><ol start="3"><li><p>Primeiro fato.</p></li><li><p>Segundo fato.</p></li></ol><h2>II — PEDIDOS</h2><p>Manter.</p>';
    const result = applySectionChangeToHtml(
      html,
      "I",
      ["Fatos consolidados."],
      ["Primeiro fato. Segundo fato."],
    );
    expect(result).toContain(
      '<ol start="3"><li><p>Fatos consolidados.</p></li></ol>',
    );
    expect(result).toContain("<h2>II — PEDIDOS</h2><p>Manter.</p>");
  });
  it("rejects a stale list proposal", () => {
    const html = "<h2>I — FATOS</h2><ol><li><p>Fato editado.</p></li></ol>";
    expect(
      applySectionChangeToHtml(html, "I", ["Proposta."], ["Fato antigo."]),
    ).toBe(html);
  });
  it("does not discard emphasis or nested lists", () => {
    for (const content of [
      "<li><p><strong>Fato.</strong></p></li>",
      "<li><p>Fato.</p><ul><li>Detalhe.</li></ul></li>",
    ]) {
      const html = `<h2>I — FATOS</h2><ol>${content}</ol>`;
      expect(applySectionChangeToHtml(html, "I", ["Proposta."])).toBe(html);
    }
  });
});
