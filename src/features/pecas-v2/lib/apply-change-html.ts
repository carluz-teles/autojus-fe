// Aplica uma mudança de parágrafos (old → new) sobre o content_html do editor —
// a source-of-truth do texto. Acha o RUN de blocos cujo texto casa com oldParagraphs
// e o substitui por newParagraphs (<p>). Se não achar (base divergente), devolve o
// HTML intacto — melhor não aplicar do que corromper.

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export function applyParagraphChangeToHtml(
  html: string,
  oldParagraphs: string[],
  newParagraphs: string[],
): string {
  if (typeof window === "undefined") return html; // SSR guard

  const oldNorm = oldParagraphs.map(norm).filter(Boolean);
  if (oldNorm.length === 0) return html;

  const doc = new DOMParser().parseFromString(
    `<div id="__root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("__root");
  if (!root) return html;

  const blocks = Array.from(root.children);
  // Acha o índice inicial do run que casa com oldNorm (texto normalizado).
  let start = -1;
  for (let i = 0; i + oldNorm.length <= blocks.length; i++) {
    let match = true;
    for (let j = 0; j < oldNorm.length; j++) {
      if (norm(blocks[i + j].textContent ?? "") !== oldNorm[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      start = i;
      break;
    }
  }
  if (start === -1) return html; // não casou → não aplica (evita corromper)

  const novos = newParagraphs.map((p) => {
    const el = doc.createElement("p");
    el.textContent = p;
    return el;
  });

  const ref = blocks[start];
  for (const n of novos) root.insertBefore(n, ref);
  for (let j = 0; j < oldNorm.length; j++) root.removeChild(blocks[start + j]);

  return root.innerHTML;
}
