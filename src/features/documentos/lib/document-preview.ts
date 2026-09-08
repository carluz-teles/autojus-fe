import DOMPurify from "isomorphic-dompurify";

export type DocumentPreview =
  { kind: "pdf"; blob: Blob } | { kind: "html"; srcDoc: string };

const DOCUMENT_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "sup",
  "sub",
  "a",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "hr",
  "table",
  "caption",
  "colgroup",
  "col",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "pre",
  "blockquote",
  "img",
];

/** Treat bytes as authoritative. Eproc legacy storage can label HTML as
 * `html`, octet-stream, or even application/pdf. Do not send HTML to pdf.js. */
export async function prepareDocumentPreview(
  blob: Blob,
): Promise<DocumentPreview> {
  const prefix = await blob.slice(0, 8_192).text();
  if (prefix.trimStart().startsWith("%PDF-")) return { kind: "pdf", blob };

  const mime = blob.type.split(";")[0].trim().toLowerCase();
  const htmlMime = ["text/html", "application/xhtml+xml", "html"].includes(
    mime,
  );
  const htmlMarkup =
    /<(?:!doctype\s+html|html|head|body|p|div|table|article|section)\b/i.test(
      prefix,
    );
  if (!htmlMarkup || (!htmlMime && !/^\s*(?:\uFEFF)?\s*</.test(prefix))) {
    throw new Error("Formato de documento não suportado.");
  }

  const head =
    /<head\b[^>]*>([\s\S]*?)(?:<\/head>|$)/i.exec(prefix)?.[1] ?? prefix;
  const firstMetaCharset = (head.match(/<meta\b[^>]*>/gi) ?? [])
    .map((meta) => /charset\s*=\s*["']?([a-z\d-]+)/i.exec(meta)?.[1])
    .find(Boolean);
  const declaredCharset =
    /charset\s*=\s*["']?([a-z\d-]+)/i.exec(blob.type)?.[1] ??
    firstMetaCharset ??
    "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(declaredCharset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  const html = decoder.decode(await blob.arrayBuffer());
  return { kind: "html", srcDoc: documentHTMLSource(html) };
}

/** Standalone inert document. The iframe has an empty sandbox; the CSP is a
 * second boundary against remote requests, forms, scripts and navigation. */
export function documentHTMLSource(raw: string): string {
  if (/<div\b[^>]*\bid\s*=\s*["']divdochtml["'][^>]*>\s*<\/div>/i.test(raw)) {
    throw new Error(
      "O tribunal retornou apenas a página de visualização. O conteúdo do auto ainda não está disponível.",
    );
  }
  const title =
    /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1].trim() ?? "";
  if (
    /^(?:eproc\s*[-–:]\s*)?(?:erro|error|login|acesso negado|sessão expirada)$/i.test(
      title,
    ) ||
    /<input\b[^>]*\btype\s*=\s*["']?password\b/i.test(raw)
  ) {
    throw new Error(
      "O tribunal retornou uma página de acesso ou erro, não um auto.",
    );
  }
  const sanitizedBody = DOMPurify.sanitize(raw, {
    RETURN_DOM: true,
    ALLOWED_TAGS: DOCUMENT_TAGS,
    ALLOWED_ATTR: [
      "align",
      "colspan",
      "rowspan",
      "scope",
      "start",
      "reversed",
      "dir",
      "lang",
      "src",
      "alt",
      "width",
      "height",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "link",
      "meta",
      "base",
      "svg",
      "math",
      "video",
      "audio",
      "source",
    ],
    FORBID_ATTR: [
      "style",
      "href",
      "srcset",
      "background",
      "action",
      "formaction",
      "ping",
      "target",
    ],
  }) as HTMLElement;
  // Only raster bytes embedded in the original document are displayable.
  // Never fetch a court/session URL or accept executable SVG/data HTML.
  for (const image of sanitizedBody.querySelectorAll("img")) {
    const source = image.getAttribute("src") ?? "";
    if (
      !/^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,[a-z\d+/=\s]+$/i.test(
        source,
      )
    )
      image.remove();
  }
  const content = sanitizedBody.innerHTML;
  const plainText = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
  if (!plainText && !sanitizedBody.querySelector("img"))
    throw new Error("O documento não contém texto disponível para leitura.");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}body{margin:0;padding:24px;color:#202828;background:#fff;font:14px/1.7 Georgia,serif;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{line-height:1.35}p{margin:0 0 1em}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%;width:auto}th,td{border:1px solid #dce1df;padding:6px 8px;vertical-align:top}pre{white-space:pre-wrap;font-size:12px}blockquote{margin-left:1em;padding-left:1em;border-left:2px solid #dce1df}hr{border:0;border-top:1px solid #dce1df;margin:1.5em 0}@media(max-width:480px){body{padding:16px}th,td{padding:4px}}</style></head><body>${content}</body></html>`;
}
