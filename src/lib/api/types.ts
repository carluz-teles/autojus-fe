// Contrato único da camada de API compartilhado entre features.

/**
 * Envelope paginado por cursor do BE (docs/erd-backend §4e.2): { data, page }.
 * `total_count` é o total do contexto atual (filtrado por ?search); `total` é o
 * total global do tenant. Sem busca os dois são iguais — a UI mostra "X de Y".
 * Fonte única: cada feature re-exporta este tipo em vez de redefini-lo (Regra nº1).
 */
export interface PageEnvelope<T> {
  data: T[];
  page: {
    next_cursor: string | null;
    limit: number;
    total_count: number;
    total: number;
  };
}
