"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Estado master–detail compartilhado pelas listas (intimações/processos): o item
// selecionado abre um Sheet slide-over. A seleção é espelhada na URL (?id=<id>)
// pela History API — shallow, sem round-trip de RSC — então o link é
// compartilhável e refresh/back reabrem o mesmo item quando ele está nas páginas
// já carregadas (o BE ainda não tem endpoint de detalhe individual).
export function useDetailDrawer<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const deepLinked = useRef(false);

  const setParam = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("id", id);
    else url.searchParams.delete("id");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const openItem = useCallback(
    (item: T) => {
      setSelected(item);
      setOpen(true);
      setParam(item.id);
    },
    [setParam],
  );

  // Só troca `open`; `selected` fica montado durante a animação de saída (o
  // conteúdo não some no meio do slide) e é limpo em onOpenChangeComplete.
  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setParam(null);
    },
    [setParam],
  );

  const onOpenChangeComplete = useCallback((next: boolean) => {
    if (!next) setSelected(null);
  }, []);

  // Deep-link: abre o item nomeado em ?id= assim que ele aparece na lista.
  // Roda no client, depois de montar (não no SSR) pra não abrir no server e
  // causar mismatch de hidratação; o guard de ref garante uma única sincronização.
  useEffect(() => {
    if (deepLinked.current || open) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    const found = items.find((it) => it.id === id);
    if (!found) return;
    deepLinked.current = true;
    // Sincroniza a seleção a partir da URL (sistema externo) uma só vez.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelected(found);
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [items, open]);

  return { selected, open, openItem, onOpenChange, onOpenChangeComplete };
}
