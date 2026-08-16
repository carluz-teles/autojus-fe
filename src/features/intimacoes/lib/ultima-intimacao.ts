// Seleção da "última intimação" do processo — função pura e testável, mesmo
// padrão do "próximo prazo" (features/prazos/lib/proximo-prazo.ts). Usada pela
// seção "Último andamento" do cockpit para linkar a intimação mais recente.

import type { IntimacaoView } from "../types";

/**
 * A intimação mais recente por `made_available_at`. Retorna null quando a
 * lista está vazia. Não assume ordenação do backend — reduz explicitamente.
 */
export function selectUltimaIntimacao(
  intimacoes: IntimacaoView[],
): IntimacaoView | null {
  if (intimacoes.length === 0) return null;
  return intimacoes.reduce((recente, i) =>
    new Date(i.made_available_at) > new Date(recente.made_available_at)
      ? i
      : recente,
  );
}
