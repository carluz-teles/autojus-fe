"use client";

import { useLayoutEffect, useRef } from "react";

import { useUrlFilters } from "@/lib/hooks/use-url-filters";

/**
 * Item selecionado no painel contextual de detalhe (Mesa de Trabalho e
 * Intimações — docs/revamp-mesa-trabalho-intimacoes.md §4). URL-backed
 * (`?painel=<id>`) pelo mesmo mecanismo dos demais filtros (useUrlFilters):
 * sobrevive a reload, é compartilhável e não some ao trocar de aba/segmento.
 * A navegação sequencial (anterior/próxima) é responsabilidade de quem chama
 * `abrir` — computada sobre a lista JÁ renderizada (mesmos filtros visíveis),
 * não uma fila separada.
 */
export function usePainelDetalhe() {
  const url = useUrlFilters();
  const id = url.get("painel") || null;
  return {
    id,
    abrir: (nextId: string) => url.set({ painel: nextId }),
    fechar: () => url.set({ painel: null }),
  };
}

/** Mantém a linha atual visível movendo apenas o scrollport da lista. */
export function useLinhaPreview(ativa: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!ativa || !row || !row.getClientRects().length) return;
    const list = row.closest<HTMLElement>('[data-slot="page-content"]');
    if (!list) return;
    const item = row.getBoundingClientRect();
    const viewport = list.getBoundingClientRect();
    if (item.top < viewport.top || item.height > list.clientHeight) {
      list.scrollTop += item.top - viewport.top;
    } else if (item.bottom > viewport.top + list.clientHeight) {
      list.scrollTop += item.bottom - viewport.top - list.clientHeight;
    }
  }, [ativa]);
  return ref;
}
