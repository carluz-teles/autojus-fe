// htmlToText extrai o TEXTO legível de um trecho HTML — para previews/labels e
// contextos que NÃO renderizam HTML (ex.: o card "INTIMAÇÃO" e o drawer de teor do
// pecas-v2, onde o teor do DJEN chega como `<html><head><style>…&Iacute;…`). Espelha
// o htmlPlaintext do BE (internal/acquisition/htmltext.go): decodifica entidades,
// descarta <script>/<style>, colapsa espaço em branco. Para renderizar HTML seguro
// (não texto), use `sanitizeContentHtml` — este util é o par "só texto".
//
// Fast-path: entrada sem '<' nem '&' é apenas trimada (não é HTML). SSR-safe: sem
// `window` (DOMParser), cai num strip por regex — os consumidores são "use client",
// então o caminho DOMParser é o normal.
export function htmlToText(input: string): string {
  if (!input) return "";
  if (!/[<&]/.test(input)) return input.trim();

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return input
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  doc.querySelectorAll("script, style").forEach((el) => el.remove());
  return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}
