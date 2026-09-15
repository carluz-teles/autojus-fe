import type { LetterheadMargins } from "../types";

// Converte 1 mm em cm com no máximo uma casa decimal, sem zero à direita (30→"3",
// 25→"2.5"). Puro — sem React; consumido pela apresentação dos cards/sheet.
function mmToCm(mm: number): string {
  return (mm / 10).toFixed(1).replace(/\.0$/, "");
}

/** Margens em cm no formato "sup · dir · inf · esq cm" (ordem ABNT do produto). */
export function formatMarginsCm(m: LetterheadMargins): string {
  return `${mmToCm(m.top_mm)} · ${mmToCm(m.right_mm)} · ${mmToCm(m.bottom_mm)} · ${mmToCm(m.left_mm)} cm`;
}
