// Rótulo e tom do chip de status de trabalho da providência — fonte única
// (Regra nº1). O board (Pipeline) e a Fila/Meus Prazos (features/prazos)
// consomem o mesmo mapa. SUGGESTED não aparece no trabalho, então não tem chip.

import type { ActionItemStatus } from "../types";

/** Rótulo humano em PT do status de trabalho (o wire é sempre o enum em inglês). */
export const STATUS_LABEL: Record<ActionItemStatus, string> = {
  SUGGESTED: "Sugerida",
  TODO: "A Fazer",
  WORKING: "Em elaboração",
  DONE: "Concluída",
};

/** Classe do chip por status de trabalho — fundo/texto por semântica. */
export const STATUS_PILL: Record<ActionItemStatus, string> = {
  SUGGESTED: "bg-muted text-muted-foreground",
  TODO: "bg-muted text-muted-foreground",
  WORKING: "bg-gold/15 text-gold",
  DONE: "bg-primary/10 text-primary",
};
