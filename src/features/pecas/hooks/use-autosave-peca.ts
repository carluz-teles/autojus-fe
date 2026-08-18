"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api/use-api";

import { patchPeca } from "../services/pecas.service";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1000;

/**
 * Autosave de conteúdo de peça (PATCH /v1/pecas/:id com debounce ~1s).
 *
 * Regras:
 * - Só dispara quando o conteúdo muda (comparado ao último salvo).
 * - "Salvando…" enquanto o PATCH está em voo; "Salvo às HH:mm" após sucesso.
 * - Erro → status "error" (banner não-bloqueante); texto NÃO é perdido.
 * - Ao desmontar, cancela o timer pendente (sem PATCH com componente desmontado).
 */
export function useAutosavePeca(id: string | null, initialContent: string) {
  const fetcher = useApi();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Rastreia o último conteúdo salvo com sucesso para evitar PATCHes desnecessários.
  const lastSaved = useRef<string>(initialContent);
  // Timer de debounce.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Idicador de montagem (evita setState após desmontagem).
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const save = useCallback(
    async (content: string) => {
      if (!id) return;
      if (!mounted.current) return;
      setStatus("saving");
      try {
        await patchPeca(fetcher, id, { content });
        if (!mounted.current) return;
        lastSaved.current = content;
        setSavedAt(new Date());
        setStatus("saved");
      } catch {
        if (!mounted.current) return;
        setStatus("error");
      }
    },
    [fetcher, id],
  );

  /**
   * Chamado pelo componente a cada mudança de conteúdo. Enfileira um PATCH com
   * debounce; cancela o timer anterior se existir.
   */
  const scheduleAutosave = useCallback(
    (content: string) => {
      if (content === lastSaved.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(content), DEBOUNCE_MS);
    },
    [save],
  );

  return {
    status,
    savedAt,
    scheduleAutosave,
  };
}
