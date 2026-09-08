import type { IntimacaoView } from "../types";

/** NO_DEADLINE stores filler dates; they must never be presented as a real deadline. */
export function prazoVisivel(i: Pick<IntimacaoView, "prazo">) {
  return i.prazo?.status === "NO_DEADLINE" ? null : (i.prazo ?? null);
}
