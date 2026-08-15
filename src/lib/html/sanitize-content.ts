import DOMPurify from "isomorphic-dompurify";

// Teor de intimação (DJEN/eproc/TJSP) chega como string "crua": às vezes texto
// puro, às vezes texto com fragmentos HTML inline (ex.: <a href=...>), às vezes
// texto + um documento HTML inteiro colado no fim (<html><head>...<body>...).
// DOMPurify faz o parsing como fragmento — as tags de documento (html/head/
// meta/style/script/body) somem, mas o conteúdo relevante dentro delas (parágrafos,
// tabelas, negrito) sobrevive sanitizado. Texto puro passa direto sem alteração.
const ALLOWED_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "section",
  "b",
  "strong",
  "i",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
];

const ALLOWED_ATTR = ["href", "align", "colspan", "rowspan"];

let hookRegistered = false;

// Força links a abrir em nova aba com rel seguro — registrado uma única vez no
// módulo (DOMPurify.addHook é global à instância importada).
function ensureLinkTargetHook() {
  if (hookRegistered) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  hookRegistered = true;
}

/**
 * Sanitiza o teor bruto de uma intimação para exibição via dangerouslySetInnerHTML.
 * Remove script/style/event handlers/URIs perigosas; preserva parágrafos, listas,
 * tabelas, negrito/itálico e links (sempre com target="_blank" + rel seguro).
 * Roda em SSR e no client (isomorphic-dompurify usa jsdom no servidor).
 */
export function sanitizeContentHtml(raw: string): string {
  ensureLinkTargetHook();
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
