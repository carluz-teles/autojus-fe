/**
 * Navegação sequencial do painel contextual (docs/revamp-mesa-trabalho-
 * intimacoes.md §4): anterior/próxima sobre a MESMA lista visível (respeitando
 * os filtros/lane/segmento ativos), nunca uma fila separada. Usado tanto pela
 * Mesa de Trabalho quanto pelo histórico de Intimações — fonte única.
 */
export interface Vizinhos<T> {
  anterior: T | null;
  proxima: T | null;
}

export function vizinhosNaLista<T extends { id: string }>(
  rows: T[],
  idAtual: string | null,
): Vizinhos<T> {
  if (!idAtual) return { anterior: null, proxima: null };
  const index = rows.findIndex((r) => r.id === idAtual);
  return {
    anterior: index > 0 ? rows[index - 1] : null,
    proxima: index >= 0 && index < rows.length - 1 ? rows[index + 1] : null,
  };
}
