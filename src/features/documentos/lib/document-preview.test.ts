import { describe, expect, it } from "vitest";

import { documentHTMLSource, prepareDocumentPreview } from "./document-preview";

describe("court document formats", () => {
  it("preserves real PDF bytes even with missing or incorrect MIME", async () => {
    const blob = new Blob(["%PDF-1.7\noriginal-pdf-bytes"], {
      type: "application/octet-stream",
    });
    const preview = await prepareDocumentPreview(blob);
    expect(preview.kind).toBe("pdf");
    if (preview.kind === "pdf") expect(preview.blob).toBe(blob);
  });

  it.each([
    "text/html; charset=utf-8",
    "html",
    "application/pdf",
    "application/octet-stream",
  ])("opens legitimate HTML with %s MIME", async (type) => {
    const html =
      "<!DOCTYPE html><html><head><title>Documento</title></head><body><h1>Decisão</h1><p>Intime-se a parte autora.</p><table><tr><th>Prazo</th><td>15 dias</td></tr></table></body></html>";
    const preview = await prepareDocumentPreview(new Blob([html], { type }));
    expect(preview.kind).toBe("html");
    if (preview.kind === "html") {
      expect(preview.srcDoc).toContain("Intime-se a parte autora.");
      expect(preview.srcDoc).toContain("<td>15 dias</td>");
    }
  });

  it("decodes a court document declaring a legacy Latin-1 charset", async () => {
    const html =
      '<html><head><meta charset="iso-8859-1"></head><body><p>Decisão e intimação.</p><div>Conteúdo anexado: charset=utf-8</div></body></html>';
    const bytes = Uint8Array.from(html, (character) => character.charCodeAt(0));
    const preview = await prepareDocumentPreview(
      new Blob([bytes], { type: "text/html" }),
    );
    expect(preview.kind).toBe("html");
    if (preview.kind === "html")
      expect(preview.srcDoc).toContain("Decisão e intimação.");
  });

  it("refuses a portal error served as application/pdf", async () => {
    await expect(
      prepareDocumentPreview(
        new Blob(["Erro: documento indisponível"], { type: "application/pdf" }),
      ),
    ).rejects.toThrow("Formato de documento não suportado");
  });

  it("refuses a login page and a portal error document", () => {
    expect(() =>
      documentHTMLSource(
        '<html><body><form><input type="password"></form><p>Informe a senha</p></body></html>',
      ),
    ).toThrow("página de acesso ou erro");
    expect(() =>
      documentHTMLSource(
        "<html><head><title>eproc - Erro</title></head><body>Indisponível</body></html>",
      ),
    ).toThrow("página de acesso ou erro");
  });
});

describe("inert HTML preview", () => {
  it("removes active content, remote assets and navigation while preserving legal text", () => {
    const html = `<html><head><base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=https://evil.example/"><link rel="stylesheet" href="https://evil.example/a.css"><style>@import url(https://evil.example/x);</style></head><body onload="steal()"><script>steal()</script><p style="background:url(https://evil.example/tracking)">Manifestação <strong>do autor</strong>.</p><a href="https://evil.example/" target="_top" ping="https://evil.example/ping">Referência preservada</a><img src="https://evil.example/a" onerror="steal()"><svg><a xlink:href="javascript:steal()">SVG</a></svg><iframe src="https://evil.example/frame"></iframe><object data="https://evil.example/object"></object><form action="https://evil.example/submit"><button>Enviar</button></form></body></html>`;
    const result = documentHTMLSource(html);
    expect(result).toContain("Manifestação <strong>do autor</strong>.");
    expect(result).toContain("Referência preservada");
    expect(result).not.toContain("evil.example");
    expect(result).not.toContain("steal()");
    expect(result).not.toMatch(
      /<(?:script|iframe|object|form|input|img|svg)\b/i,
    );
    expect(result).toContain("default-src 'none'");
    expect(result).toContain("form-action 'none'");
  });

  it("preserves table structure and long text without accepting inline CSS", () => {
    const result = documentHTMLSource(
      '<h2>Dispositivo</h2><table><tbody><tr><td colspan="2" style="position:fixed">Pagamento devido</td></tr></tbody></table><pre>Linha 1\nLinha 2</pre>',
    );
    expect(result).toContain('colspan="2"');
    expect(result).toContain("<pre>Linha 1\nLinha 2</pre>");
    expect(result).not.toContain("position:fixed");
  });
});

it("refuses an empty Eproc wrapper that requires a server-side document fetch", () => {
  expect(() =>
    documentHTMLSource(
      '<html><body><div>Imprimir e copiar link</div><div id="Content"><div id="divdochtml"></div></div><script>fetch("controlador.php?token=secret")</script></body></html>',
    ),
  ).toThrow("apenas a página de visualização");
});

it("preserves embedded raster scans without allowing SVG, remote or relative image requests", () => {
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
  const html = `<p>Documento digitalizado</p><img alt="Página digitalizada" src="${png}"><img src="https://example.com/secret"><img src="controlador.php?doc=secret"><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">`;
  const result = documentHTMLSource(html);
  expect(result).toContain(png);
  expect(result).toContain('alt="Página digitalizada"');
  expect(result).not.toContain("example.com");
  expect(result).not.toContain("controlador.php");
  expect(result).not.toContain("image/svg+xml");
  expect(result).toContain("img-src data:");
});

it("allows an auto containing only an embedded raster scan", () => {
  expect(
    documentHTMLSource(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Auto digitalizado">',
    ),
  ).toContain("Auto digitalizado");
});
