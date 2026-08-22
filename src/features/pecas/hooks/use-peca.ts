"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  criarPeca,
  type CriarPecaParams,
  getPeca,
  salvarRascunho,
} from "../services/pecas.service";

// Chaves de query da feature Peça, centralizadas para invalidação consistente.
export const pecasKeys = {
  all: ["pecas"] as const,
  detail: (id: string) => [...pecasKeys.all, "detail", id] as const,
};

/** Detalhe da peça — GET /v1/pecas/:id (rascunho + contexto). */
export function usePeca(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: pecasKeys.detail(id),
    queryFn: () => getPeca(fetcher, id),
    enabled: !!id,
  });
}

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Autosave do rascunho — PATCH /v1/pecas/:id com debounce. A peça expõe:
 *   • save(content)  — agenda um autosave; chamadas rápidas em sequência coalescem
 *                      numa só request após AUTOSAVE_DELAY_MS de silêncio;
 *   • saveNow()      — força o flush imediato (ex.: sair da tela / blur);
 *   • isSaving       — request em voo (para o rótulo "Salvando…");
 *   • lastSavedAt    — timestamp do último autosave bem-sucedido (para "salvo há …").
 *
 * Não faz optimistic update do editor (o editable é a fonte de verdade do texto
 * enquanto o usuário digita) — só reconcilia o updated_at no cache no sucesso.
 */
export function useSalvarRascunho(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (content: string) => salvarRascunho(fetcher, id, content),
    onSuccess: (res) => {
      setLastSavedAt(new Date(res.updated_at));
      // Reconcilia só o updated_at no cache; o content vivo é do editor.
      qc.setQueryData(pecasKeys.detail(id), (prev: unknown) =>
        prev && typeof prev === "object"
          ? { ...prev, updated_at: res.updated_at, title: res.title }
          : prev,
      );
    },
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const content = pending.current;
    if (content !== null) {
      pending.current = null;
      mutation.mutate(content);
    }
  }, [mutation]);

  const save = useCallback(
    (content: string) => {
      pending.current = content;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  // Flush pendente ao desmontar (troca de peça / navegação) para não perder texto.
  useEffect(
    () =>
      function cleanup() {
        if (timer.current) clearTimeout(timer.current);
        if (pending.current !== null) {
          salvarRascunho(fetcher, id, pending.current).catch(() => {
            // best-effort no unmount; o próximo load reflete o último salvo.
          });
        }
      },
    [fetcher, id],
  );

  return {
    save,
    saveNow: flush,
    isSaving: mutation.isPending,
    lastSavedAt,
    error: mutation.error,
  };
}

/** Cria (ou reaproveita, idempotente por intimação) um rascunho — POST /v1/pecas. */
export function useCriarPeca() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CriarPecaParams) => criarPeca(fetcher, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: pecasKeys.all }),
  });
}
