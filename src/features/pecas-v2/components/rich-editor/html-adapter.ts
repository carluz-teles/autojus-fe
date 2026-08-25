// Adapter entre StructuredContent (JSON semântico do BE) e HTML rico (formato
// do Tiptap). Enquanto a Fase B do editor não subir, o BE ainda guarda a
// peça como {preamble, sections[]} e a IA continua devolvendo esse shape —
// então precisamos converter nas duas direções no cliente.
//
// Formato de HTML gerado (round-trip lossy — HTML rico → JSON perde
// formatação inline; JSON → HTML gera texto puro em <p>):
//
//   <p><strong>ENDEREÇAMENTO EM CAIXA</strong></p>
//   <p>Qualificação da parte…</p>
//   <h2>I — DOS FATOS</h2>
//   <p>1. Parágrafo 1…</p>
//   <p>2. Parágrafo 2…</p>
//   <h2>II — DO DIREITO</h2>
//   …
//
// Section IDs viram data-section-id no <h2> pra que o parseHtml consiga
// remontar sections com os mesmos ids (necessário pra iterate-section
// mapear de volta ao BE).

import type {
  DraftPreamble,
  DraftSection,
  StructuredContent,
} from "../../types";

/** Constrói HTML rico a partir de StructuredContent. Preamble vira <p>s;
 *  cada section vira <h2> + <p>s. Preserva IDs via data-section-id. */
export function structuredToHtml(sc: StructuredContent): string {
  const parts: string[] = [];

  // Preâmbulo — 1º parágrafo em <strong> (endereçamento CAIXA), demais puros.
  for (let i = 0; i < sc.preamble.paragraphs.length; i++) {
    const raw = escapeHtml(sc.preamble.paragraphs[i]);
    if (i === 0) {
      parts.push(`<p><strong>${raw}</strong></p>`);
    } else {
      parts.push(`<p>${raw}</p>`);
    }
  }

  // Seções — cabeçalho em <h2 data-section-id data-roman> + parágrafos.
  for (const s of sc.sections) {
    const heading = s.title ? `${s.roman} — ${s.title.toUpperCase()}` : s.roman;
    parts.push(
      `<h2 data-section-id="${escapeAttr(s.id)}" data-roman="${escapeAttr(s.roman)}">${escapeHtml(heading)}</h2>`,
    );
    for (const p of s.paragraphs) {
      parts.push(`<p>${escapeHtml(p)}</p>`);
    }
  }

  return parts.join("\n");
}

/** Reversa: converte HTML do Tiptap de volta pra StructuredContent.
 *  Perde formatação inline (bold/italic viram texto puro) — é aceitável no
 *  intermediário, porque o BE ainda persiste só o shape semântico. Quando
 *  a Fase B subir, essa fn é retirada — o cliente salva HTML direto. */
export function htmlToStructured(html: string): StructuredContent {
  if (typeof document === "undefined") {
    // SSR safety: retorna estrutura vazia, deixa o client re-render popular.
    return { preamble: { paragraphs: [] }, sections: [] };
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  const preamble: DraftPreamble = { paragraphs: [] };
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;

  // Percorre em ordem — <p> antes do 1º <h2> alimenta preamble; <h2> abre
  // nova section; <p>/<ul>/<ol>/<blockquote>/<table> viram texto no section
  // corrente (versão simples: strip tags, quebra por \n).
  for (const node of Array.from(tmp.children)) {
    const tag = node.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const romanFromAttr = node.getAttribute("data-roman") ?? "";
      const idFromAttr = node.getAttribute("data-section-id") ?? "";
      const text = (node.textContent ?? "").trim();
      // Extrai roman + title do texto "I — DOS FATOS" quando não há attrs.
      let roman = romanFromAttr;
      let title = "";
      const m = text.match(/^([IVX]+)\s*(?:—|-|:)?\s*(.*)$/);
      if (m) {
        if (!roman) roman = m[1];
        title = capitalizeSentence(m[2]);
      } else {
        title = capitalizeSentence(text);
      }
      const id = idFromAttr || slugify(title) || `s${sections.length + 1}`;
      current = {
        id,
        roman,
        title,
        shortTitle: title.split(/\s+/).slice(-1)[0] || roman,
        paragraphs: [],
      };
      sections.push(current);
      continue;
    }
    // Bloco de conteúdo (p/ul/ol/blockquote/table).
    const text = extractParagraphText(node as HTMLElement);
    if (!text) continue;
    if (current) {
      current.paragraphs.push(text);
    } else {
      preamble.paragraphs.push(text);
    }
  }

  return { preamble, sections };
}

/** Extrai o texto de um bloco preservando quebras de parágrafo internas.
 *  Tabelas viram uma linha "Cel1 | Cel2 | Cel3" por row (aceitável no
 *  intermediário; Fase B guarda HTML puro). */
function extractParagraphText(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "ul" || tag === "ol") {
    return Array.from(el.querySelectorAll("li"))
      .map((li, i) => {
        const prefix = tag === "ol" ? `${i + 1}. ` : "• ";
        return prefix + (li.textContent ?? "").trim();
      })
      .join("\n");
  }
  if (tag === "table") {
    return Array.from(el.querySelectorAll("tr"))
      .map((tr) =>
        Array.from(tr.children)
          .map((c) => (c.textContent ?? "").trim())
          .join(" | "),
      )
      .join("\n");
  }
  return (el.textContent ?? "").trim();
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll('"', "&quot;");
}
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function capitalizeSentence(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
