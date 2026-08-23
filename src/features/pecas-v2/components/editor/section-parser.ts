// Parser de texto plano em seções — usado quando o BE devolve `content: string`
// (o formato atual persistido). No mock desta rodada o Draft já vem estruturado,
// mas o parser fica pronto pra rodada de integração real.
//
// Heurística: uma linha que casa com o cabeçalho romano ("I — Dos fatos", "II
// - Do direito"…) começa uma nova seção. Tudo antes do primeiro cabeçalho é
// preâmbulo. Aceita travessão em qualquer forma (— - –).

import type { DraftPreamble, DraftSection } from "../../types";

const HEADING_RE = /^\s*(I{1,3}|IV|V|VI{0,3}|IX|X)\s*[—–-]\s*(.+?)\s*$/;

export interface ParsedContent {
  preamble: DraftPreamble;
  sections: DraftSection[];
}

export function parseContent(content: string): ParsedContent {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const preamble: DraftPreamble = { paragraphs: [] };
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;

  for (const p of paragraphs) {
    const first = p.split("\n")[0];
    const m = HEADING_RE.exec(first);
    if (m) {
      // Fecha a seção anterior (se houver) e começa uma nova.
      const [, roman, title] = m;
      const cleanTitle = title
        .trim()
        .replace(/^Dos\s+/i, "Dos ")
        .trim();
      current = {
        id: slug(cleanTitle),
        roman,
        title: cleanTitle,
        shortTitle: shortTitleOf(cleanTitle),
        paragraphs: [],
      };
      sections.push(current);
      // O resto do parágrafo (se houver após o heading) entra como conteúdo.
      const rest = p.slice(first.length).trim();
      if (rest) current.paragraphs.push(rest);
      continue;
    }
    if (current) {
      current.paragraphs.push(p);
    } else {
      preamble.paragraphs.push(p);
    }
  }

  return { preamble, sections };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "Dos fatos" → "Fatos" (só o núcleo, pro chip caber).
function shortTitleOf(title: string): string {
  return title.replace(/^(dos?|das?|do|da)\s+/i, "").trim();
}
