// pending-removal — extensão Tiptap que MARCA no próprio texto da peça o(s)
// trecho(s) que uma tese em `pending_remove` produziu (thesis↔segment). Em vez de
// duplicar o texto num card à parte, o advogado vê exatamente os parágrafos que
// sairão, tachados/destacados IN LOCO no editor.
//
// Por que Decorations e não classList: o ProseMirror reconcilia o DOM e apaga
// qualquer classe adicionada direto nos seus nós (mesma razão do overlay em
// highlightSection). Decorations vivem no estado do editor → sobrevivem a
// re-render e streaming.
//
// A marcação é por SEÇÃO (algarismo romano do heading): do heading da seção até
// imediatamente antes do próximo heading de seção (level ≤ 2). Subtítulos internos
// (h3/negrito) não quebram a marcação — herdam o estado da seção corrente.

import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const pendingRemovalKey = new PluginKey<PendingRemovalState>(
  "pendingRemoval",
);

interface PendingRemovalState {
  romans: string[];
  decos: DecorationSet;
}

/** Extrai o algarismo romano inicial de um texto de heading ("I — DAS
 *  PRELIMINARES" → "I"). Vazio quando não há. */
function leadingRoman(text: string): string {
  const m = /^\s*([IVXLCDM]+)\b/i.exec(text);
  return m ? m[1].toUpperCase() : "";
}

function buildDecorations(doc: PMNode, romans: string[]): DecorationSet {
  if (romans.length === 0) return DecorationSet.empty;
  const wanted = new Set(romans.map((r) => r.toUpperCase()));
  const decos: Decoration[] = [];
  let marking = false;
  doc.forEach((node, offset) => {
    const isSectionHeading =
      node.type.name === "heading" && (node.attrs.level ?? 1) <= 2;
    if (isSectionHeading) {
      // Um heading de seção (re)define o estado: marca se o romano estiver na
      // lista, senão encerra a marcação da seção anterior.
      const roman = leadingRoman(node.textContent);
      marking = roman !== "" && wanted.has(roman);
    }
    if (marking) {
      decos.push(
        Decoration.node(offset, offset + node.nodeSize, {
          class: "peca-pending-remove",
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

export const PendingRemoval = Extension.create({
  name: "pendingRemoval",

  addProseMirrorPlugins() {
    return [
      new Plugin<PendingRemovalState>({
        key: pendingRemovalKey,
        state: {
          init: () => ({ romans: [], decos: DecorationSet.empty }),
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(pendingRemovalKey) as
              { romans: string[] } | undefined;
            if (meta) {
              return {
                romans: meta.romans,
                decos: buildDecorations(newState.doc, meta.romans),
              };
            }
            if (tr.docChanged && value.romans.length > 0) {
              // O texto mudou (edição/streaming) — recalcula as posições.
              return {
                romans: value.romans,
                decos: buildDecorations(newState.doc, value.romans),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return pendingRemovalKey.getState(state)?.decos;
          },
        },
      }),
    ];
  },
});

/** Extrai os romanos das seções a marcar a partir dos headings dos segmentos. */
export function romansFromHeadings(headings: string[]): string[] {
  const out: string[] = [];
  for (const h of headings) {
    const r = leadingRoman(h);
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}
