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
  expectedParagraphs?: string[],
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

  const body = blocks.slice(headingIdx + 1, end);
  if (
    expectedParagraphs &&
    JSON.stringify(body.map((b) => norm(blockText(b))).filter(Boolean)) !==
      JSON.stringify(expectedParagraphs.map(norm).filter(Boolean))
  )
    return html;
  // Plain numbered/bulleted sections keep their list container and numbering.
  // Nested lists, custom item attributes and inline formatting still require a
  // richer proposal contract; never silently flatten them into plain text.
  if (body.length === 1 && ["OL", "UL"].includes(body[0].tagName)) {
    const list = body[0];
    const items = Array.from(list.children);
    const plain = items.every(
      (item) =>
        item.tagName === "LI" &&
        item.attributes.length === 0 &&
        (item.children.length === 0 ||
          (item.children.length === 1 &&
            item.children[0].tagName === "P" &&
            item.children[0].children.length === 0 &&
            item.children[0].attributes.length === 0)),
    );
    const next = newParagraphs.map((p) => p.trim()).filter(Boolean);
    if (!plain || next.length === 0) return html;
    const replacement = list.cloneNode(false) as Element;
    for (const paragraph of next) {
      const item = doc.createElement("li");
      const p = doc.createElement("p");
      p.textContent = paragraph;
      item.appendChild(p);
      replacement.appendChild(item);
    }
    list.replaceWith(replacement);
    return root.innerHTML;
  }
  // Match unchanged blocks first. A text-only proposal must never flatten a
  // list/table or silently discard formatting from a removed rich paragraph.
  const paragraphs = newParagraphs.map((p) => p.trim()).filter(Boolean);
  const reusable = new Set(body);
  const matched = paragraphs.map((p) => {
    const block = [...reusable].find(
      (b) => norm(b.textContent ?? "") === norm(p),
    );
    if (block) reusable.delete(block);
    return block;
  });
  const novos: Node[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    if (matched[i]) {
      novos.push(matched[i]!.cloneNode(true));
      continue;
    }
    const original = body.length === paragraphs.length ? body[i] : undefined;
    if (
      original &&
      reusable.has(original) &&
      original.tagName === "P" &&
      !original.querySelector("img, br")
    ) {
      const clone = original.cloneNode(true) as Element;
      replaceParagraphText(doc, clone, paragraphs[i]);
      novos.push(clone);
      reusable.delete(original);
    } else {
      const el = doc.createElement("p");
      el.textContent = paragraphs[i];
      novos.push(el);
    }
  }
  if (
    [...reusable].some(
      (block) =>
        block.tagName !== "P" ||
        block.children.length > 0 ||
        block.attributes.length > 0,
    )
  )
    return html;
  const heading = blocks[headingIdx];
  const anchor = heading.nextSibling;
  for (const n of novos) root.insertBefore(n, anchor);
  // Remove o corpo antigo (os blocos originais entre heading e o próximo heading).
  for (let j = headingIdx + 1; j < end; j++) root.removeChild(blocks[j]);

  return root.innerHTML;
}

/** Replace only the changed character span; retain paragraph attributes and
 * inline marks in the unchanged prefix/suffix. Complex blocks are never passed. */
function replaceParagraphText(doc: Document, block: Element, next: string) {
  const old = block.textContent ?? "";
  let start = 0;
  while (
    start < old.length &&
    start < next.length &&
    old[start] === next[start]
  )
    start++;
  let suffix = 0;
  while (
    suffix < old.length - start &&
    suffix < next.length - start &&
    old[old.length - 1 - suffix] === next[next.length - 1 - suffix]
  )
    suffix++;
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  if (!nodes.length) {
    block.textContent = next;
    return;
  }
  const locate = (offset: number): [Text, number] => {
    for (const node of nodes) {
      if (offset <= node.length) return [node, offset];
      offset -= node.length;
    }
    const last = nodes[nodes.length - 1];
    return [last, last.length];
  };
  const range = doc.createRange();
  range.setStart(...locate(start));
  range.setEnd(...locate(old.length - suffix));
  range.deleteContents();
  range.insertNode(doc.createTextNode(next.slice(start, next.length - suffix)));
}

// Match the backend's nodeText boundaries, including lists serialized without
// whitespace by the editor. Inline emphasis must not introduce spaces.
function blockText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  const text = Array.from(node.childNodes).map(blockText).join("");
  return (
    text +
    (node instanceof Element && ["LI", "TR", "BR"].includes(node.tagName)
      ? "\n"
      : "")
  );
}
