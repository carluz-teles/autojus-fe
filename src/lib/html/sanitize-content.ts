import DOMPurify from "isomorphic-dompurify";

// Teor de intimação (DJEN/eproc/TJSP) chega em 3 formatos:
//   1. Documento HTML completo: <html><head><meta><style></style></head><body>
//      <article><section>... — o típico do DJEN. Cheio de \n\t\t\t\t do
//      templating original, entidades &Ccedil;, e <table> aninhada em <b>.
//   2. Fragmento HTML solto: <section><b><table>... sem <html> wrapper.
//   3. Texto puro: uma linha só, sem tags.
//
// DOMPurify parseia como fragmento — tags de documento (html/head/meta/style/
// script/body) somem, e a whitelist controla o resto. As entidades (&Ccedil;)
// o próprio browser decoda ao setar innerHTML depois. O que precisa cuidado é:
//   - Whitespace bagunçado do template DJEN vira espaços visíveis (browser
//     colapsa \n\t em 1 espaço só, mas o total ainda pode ficar horrível).
//     `white-space: normal` no CSS do container resolve — o consumidor cuida.
//   - <article>/<section>/<header> não estavam na whitelist → texto interno
//     colado sem separação. Agora aceitos como containers neutros.
//   - <b> envolvendo <table> inteira (HTML inválido) — o browser desloca as
//     tabs "pra fora" mas o resultado visual fica confuso. Colapsamos <b>
//     vazios/redundantes depois de sanitizar.
const ALLOWED_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "section",
  "article",
  "header",
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
 * Também normaliza o whitespace excessivo do template DJEN (\n\t\t\t\t\n\n\n
 * viram uma quebra só) — o browser colapsa em runtime, mas normalizar cedo
 * evita layout thrashing no painel estreito e mantém o output copy-friendly.
 * Roda em SSR e no client (isomorphic-dompurify usa jsdom no servidor).
 */
export function sanitizeContentHtml(raw: string): string {
  ensureLinkTargetHook();
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  return normalizeWhitespace(clean);
}

// normalizeWhitespace colapsa runs de whitespace pra evitar o "efeito escadinha"
// do template DJEN. Preserva quebras dentro de <pre> quando aparecerem (raro no
// teor mas defensivo).
//
// Regras (ordem importa):
//   1. Colapsa quebras + tabs entre tags em uma quebra só ("</td>\n\t\t\n\t"
//      → "</td>\n") — melhora o HTML fonte sem alterar renderização.
//   2. Colapsa runs de 2+ espaços dentro de texto em um único espaço.
//   3. Remove <b>...</b> vazios ou só com whitespace (herança do "b envolve
//      tudo" do DJEN quando o conteúdo já sanitizou pra nada).
function normalizeWhitespace(html: string): string {
  return html
    .replace(/>\s+</g, ">\n<") // whitespace entre tags → uma quebra só
    .replace(/[ \t]{2,}/g, " ") // 2+ espaços/tabs internos → 1 espaço
    .replace(/\n{3,}/g, "\n\n") // 3+ quebras → 2 (paragraph break máximo)
    .replace(/<b>\s*<\/b>/gi, "") // <b> vazio → some
    .replace(/<strong>\s*<\/strong>/gi, "");
}
