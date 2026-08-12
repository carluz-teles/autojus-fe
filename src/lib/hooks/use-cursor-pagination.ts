"use client";

import { useCallback, useState } from "react";

/**
 * Paginação prev/próxima sobre o cursor keyset do BE, que só sabe avançar. O "voltar"
 * mora aqui: uma pilha de cursores visitados. `stack[i]` é o cursor usado para buscar
 * a página `i+1`; começa em `[undefined]` (a página 1 não tem cursor). Avançar empilha
 * o `next_cursor` recém-recebido; voltar desempilha. O cursor ativo é sempre o topo.
 *
 * `resetKey` identifica o contexto da listagem (termo de busca + tamanho de página).
 * Quando ele muda, a pilha volta à primeira página — de forma síncrona no render, para
 * nunca disparar um fetch com um cursor obsoleto contra um novo filtro.
 */
export function useCursorPagination(resetKey: string) {
  const [stack, setStack] = useState<(string | undefined)[]>([undefined]);

  // Reset síncrono ao trocar de filtro: padrão oficial do React de guardar o valor
  // anterior em state e ajustar durante o render (roda uma vez por mudança de chave).
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setStack([undefined]);
  }

  const activeCursor = stack[stack.length - 1];
  const pageNumber = stack.length; // 1-based
  const canPrev = stack.length > 1;

  const next = useCallback((nextCursor: string) => {
    setStack((s) => [...s, nextCursor]);
  }, []);

  const prev = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const reset = useCallback(() => {
    setStack((s) => (s.length === 1 && s[0] === undefined ? s : [undefined]));
  }, []);

  return { activeCursor, pageNumber, canPrev, next, prev, reset };
}
