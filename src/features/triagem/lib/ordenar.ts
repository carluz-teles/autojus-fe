// Ordenação por urgência da fila de Triagem — CLIENT-SIDE nesta v1 (o BE não
// expõe `?sort=` pro endpoint de intimações; o envelope só garante o default
// made_available_at DESC). Critério (decisão do Architect): prazo.days_left
// ASC (mais urgente primeiro), itens sem prazo derivado por último; empate
// (mesmo days_left, ou ambos sem prazo) resolvido por made_available_at DESC
// (mais recente primeiro). Não muta o array de entrada.

import type { IntimacaoView } from "@/features/intimacoes/types";

export function ordenarPorUrgencia(itens: IntimacaoView[]): IntimacaoView[] {
  return [...itens].sort((a, b) => {
    if (a.prazo && b.prazo) {
      if (a.prazo.days_left !== b.prazo.days_left) {
        return a.prazo.days_left - b.prazo.days_left;
      }
      return b.made_available_at.localeCompare(a.made_available_at);
    }
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return b.made_available_at.localeCompare(a.made_available_at);
  });
}
