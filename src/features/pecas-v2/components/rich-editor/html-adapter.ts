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

import type { StructuredContent } from "../../types";

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

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll('"', "&quot;");
}
