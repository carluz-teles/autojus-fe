"use client";

// Teses da peça (contrato Teses) — versão enxuta pós-streaming.
//
// A GERAÇÃO das teses é do STREAM (useThesesStream, em use-construction): no 1º
// acesso do pregen ele produz os fundamentos um a um e persiste o conjunto
// autoritativo. Este controller NÃO auto-gera nada — só serve a lista persistida
// (GET), a seleção do rail e a regeração MANUAL/fallback (POST /theses síncrono,
// disparada pelo botão "Atualizar fundamentos" e pela degradação do stream).
//
// Removido (era legado pré-streaming): o polling de `/theses/sources` a cada 15s
// e a query `automatic` que auto-gerava quando `needs_refresh` — as duas corriam
// com o stream (dupla geração de IA + reset do estado do stream antes do `done`,
// travando a UI em "consultando os autos…"). Uma só fonte de geração agora.
//
// Regra do rail (só PROPÕE — aprovação é do editor, fora deste milestone):
//   off ↔ pending_add        (clicar numa candidata propõe incluir)
//   included ↔ pending_remove (clicar numa incluída propõe remover)
// A geração da minuta usa as teses em `included` ∪ `pending_add`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";

import { isSelectedForGeneration } from "../lib/thesis-selection";
export { isSelectedForGeneration } from "../lib/thesis-selection";
import * as svc from "../services/pecas-v2.service";
import type { Draft, Thesis, ThesisState } from "../types";
import { draftKeys } from "./use-draft";

export const thesesKey = (id: string) =>
  [...draftKeys.all, "theses", id] as const;

/** Próximo estado no clique do rail (só as transições de propor). */
function nextRailState(current: ThesisState): ThesisState {
  switch (current) {
    case "off":
      return "pending_add";
    case "pending_add":
      return "off";
    case "included":
      return "pending_remove";
    case "pending_remove":
      return "included";
  }
}

function useTheses(id: string) {
  const fetcher = useApi();
  const query = useQuery({
    queryKey: thesesKey(id),
    queryFn: () => svc.getTheses(fetcher, id),
    enabled: !!id,
    // O stream (onDone) e as ações de seleção atualizam este cache explicitamente
    // via setQueryData. Ler a lista nunca dispara geração.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  useAIExperience(
    `/v1/pecas/${id}/theses`,
    query.isSuccess && !query.isFetching,
    "complete",
    query.dataUpdatedAt,
  );
  return query;
}

/** Regeração MANUAL/fallback: POST /theses síncrono → substitui a lista. */
function useGenerateTheses(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.generateTheses(fetcher, id),
    onSuccess: (theses) => {
      qc.setQueryData<Thesis[]>(thesesKey(id), theses);
    },
  });
}

function useUpdateThesisState(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { thesisId: string; state: ThesisState }) =>
      svc.updateThesisState(fetcher, id, input.thesisId, input.state),
    onSuccess: (updated) => {
      qc.setQueryData<Thesis[]>(thesesKey(id), (prev) =>
        prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : [updated],
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: thesesKey(id) });
    },
  });
}

function useGenerateDraft(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        | string[]
        | { thesisIds: string[]; revision?: string; instructions?: string },
    ) =>
      Array.isArray(input)
        ? svc.generateDraft(fetcher, id, input)
        : svc.generateDraft(
            fetcher,
            id,
            input.thesisIds,
            input.instructions,
            input.revision ? { revision: input.revision } : undefined,
          ),
    onSuccess: (result, input) => {
      const selected = new Set(Array.isArray(input) ? input : input.thesisIds);
      qc.setQueryData<Thesis[]>(thesesKey(id), (list) =>
        list?.map((thesis) => ({
          ...thesis,
          state: selected.has(thesis.id) ? "included" : "off",
        })),
      );
      // Start polling/streaming immediately, including before the first refetch.
      qc.setQueryData(draftKeys.detail(id), (d: Draft | undefined) =>
        d ? { ...d, sagaState: "EXTRACTING", updatedAt: result.updated_at } : d,
      );
      void qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: thesesKey(id) });
    },
  });
}

export interface ThesesController {
  theses: Thesis[];
  isLoading: boolean;
  isError: boolean;
  /** Contagem selecionada (included ∪ pending_add). */
  selectedCount: number;
  /** thesisIds a passar pra geração (included ∪ pending_add). */
  selectedIds: string[];
  /** Clique numa linha do rail — propõe a transição de estado. */
  toggle: (thesis: Thesis) => void;
  /** (Re)gera as teses de forma síncrona (botão "Atualizar" + fallback do stream). */
  regenerate: () => void;
  isRegenerating: boolean;
  isTogglingId: string | null;
}

/** Hook público — a página chama só isto. `useGenerateDraft` é exposto à parte
 *  (a página o usa no "Gerar minuta"). */
export function useThesesController(id: string): ThesesController {
  const list = useTheses(id);
  const regen = useGenerateTheses(id);
  const patch = useUpdateThesisState(id);

  const theses = list.data ?? [];
  const selected = theses.filter((t) => isSelectedForGeneration(t.state));

  return {
    theses,
    isLoading: list.isLoading,
    isError: list.isError || regen.isError,
    selectedCount: selected.length,
    selectedIds: selected.map((t) => t.id),
    toggle: (thesis) =>
      patch.mutate({ thesisId: thesis.id, state: nextRailState(thesis.state) }),
    regenerate: () => {
      if (!regen.isPending) regen.mutate();
    },
    isRegenerating: regen.isPending,
    isTogglingId: patch.isPending ? (patch.variables?.thesisId ?? null) : null,
  };
}

export { useGenerateDraft };
