// Aplica uma mudança de SEÇÃO (do Assistente) sobre o content_html do editor —
// a source-of-truth do texto. Âncora = o HEADING da seção (h1–h3 com o algarismo
// romano): troca TODO o corpo da seção (do heading até o próximo heading) pelos
// novos parágrafos. Robusto a estrutura (ol/li, tabelas) e preserva as outras
// seções. Se não achar a seção, devolve o HTML intacto — não corrompe.

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

/** Extrai o romano do texto de um heading ("I – DOS FATOS" → "I"). "" se não houver. */
function romanOfHeading(text: string): string {
  const t = norm(text);
  for (const sep of ["—", "–", "-", ":"]) {
    const i = t.indexOf(sep);
    if (i > 0) {
      const head = t.slice(0, i).trim();
      if (/^[IVXLCDM]{1,6}$/.test(head)) return head;
    }
  }
  return "";
}

export function applySectionChangeToHtml(
  html: string,
  sectionRoman: string,
  newParagraphs: string[],
): string {
  if (typeof window === "undefined") return html; // SSR guard
  const roman = norm(sectionRoman);
  if (!roman) return html; // sem âncora de seção → não aplica

  const doc = new DOMParser().parseFromString(
    `<div id="__root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("__root");
  if (!root) return html;

  const blocks = Array.from(root.children);

  // Acha o heading da seção-alvo.
  let headingIdx = -1;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (
      HEADING_TAGS.has(b.tagName) &&
      romanOfHeading(b.textContent ?? "") === roman
    ) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx === -1) return html; // seção não encontrada → não aplica

  // Corpo da seção = blocos após o heading até o próximo heading (exclusive).
  let end = headingIdx + 1;
  while (end < blocks.length && !HEADING_TAGS.has(blocks[end].tagName)) end++;

  // Novos parágrafos (<p>) inseridos logo após o heading.
  const heading = blocks[headingIdx];
  const anchor = heading.nextSibling; // onde reinserir (antes do 1º bloco do corpo)
  const novos = newParagraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const el = doc.createElement("p");
      el.textContent = p;
      return el;
    });
  for (const n of novos) root.insertBefore(n, anchor);
  // Remove o corpo antigo (os blocos originais entre heading e o próximo heading).
  for (let j = headingIdx + 1; j < end; j++) root.removeChild(blocks[j]);

  return root.innerHTML;
}
