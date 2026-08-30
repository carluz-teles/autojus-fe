"use client";

// Teses da peça (contrato Teses). Expõe a lista + as ações de propor (rail) e
// a geração da minuta. O PATCH de estado invalida a lista pra re-render.
//
// Regra do rail (só PROPÕE — aprovação é do editor, fora deste milestone):
//   off ↔ pending_add      (clicar numa candidata propõe incluir)
//   included ↔ pending_remove (clicar numa incluída propõe remover)
// A geração usa as teses em `included` ∪ `pending_add`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import type { Thesis, ThesisState } from "../types";
import { draftKeys } from "./use-draft";

const thesesKey = (id: string) => [...draftKeys.all, "theses", id] as const;

/** Estados que contam como "selecionada para a geração". */
export function isSelectedForGeneration(state: ThesisState): boolean {
  return state === "included" || state === "pending_add";
}

/** Próximo estado no clique do rail (só as transições de propor). Estados
 *  terminais do editor (que o rail não alcança) caem no toggle equivalente. */
export function nextRailState(current: ThesisState): ThesisState {
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
  return useQuery({
    queryKey: thesesKey(id),
    queryFn: () => svc.getTheses(fetcher, id),
    enabled: !!id,
  });
}

function useGenerateTheses(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.generateTheses(fetcher, id),
    onSuccess: (theses) => qc.setQueryData<Thesis[]>(thesesKey(id), theses),
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
    mutationFn: (thesisIds: string[]) =>
      svc.generateDraft(fetcher, id, thesisIds),
    onSuccess: () => {
      // O saga entra em CREATED/EXTRACTING; o useDraft assume o polling.
      qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
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
  /** (Re)gera as sugestões de teses ancoradas nos anexos. */
  regenerate: () => void;
  isRegenerating: boolean;
  isTogglingId: string | null;
}

/** Hook público — compõe os sub-hooks _private de teses. O componente chama só
 *  isto. `useGenerateDraft` é exposto à parte (a página o usa no "Gerar minuta"). */
export function useThesesController(id: string): ThesesController {
  const list = useTheses(id);
  const regen = useGenerateTheses(id);
  const patch = useUpdateThesisState(id);

  const theses = list.data ?? [];
  const selected = theses.filter((t) => isSelectedForGeneration(t.state));

  return {
    theses,
    isLoading: list.isLoading,
    isError: list.isError,
    selectedCount: selected.length,
    selectedIds: selected.map((t) => t.id),
    toggle: (thesis) =>
      patch.mutate({ thesisId: thesis.id, state: nextRailState(thesis.state) }),
    regenerate: () => regen.mutate(),
    isRegenerating: regen.isPending,
    isTogglingId: patch.isPending ? (patch.variables?.thesisId ?? null) : null,
  };
}

export { useGenerateDraft };
