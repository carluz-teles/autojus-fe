"use client";

import { useEffect, useState } from "react";

/**
 * Devolve `value` atrasado por `delayMs` — remonta o timer a cada mudança, então só
 * emite quando o valor fica estável (ex.: busca por digitação sem uma request por
 * tecla). Usado pela toolbar de busca das tabelas.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
