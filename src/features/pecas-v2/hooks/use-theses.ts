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

/** Estados que aparecem como bloco na seção "Do direito" (state ≠ off). */
export function isInDireito(state: ThesisState): boolean {
  return state !== "off";
}

/** As três decisões que o EDITOR permite por bloco de tese (aprovação):
 *   - pending_add:   "Aprovar"=include / "Descartar"=discard
 *   - pending_remove:"Aprovar remoção"=include(off) / "Manter"=keep(included)
 *   - included:      "Remover"=remove(pending_remove)
 *  Cada verbo resolve pro `ThesisState` alvo do PATCH conforme a tese. */
export type EditorThesisAction =
  | "approve" // pending_add → included
  | "discard" // pending_add → off
  | "approveRemoval" // pending_remove → off
  | "keep" // pending_remove → included
  | "remove"; // included → pending_remove

/** Resolve o estado-alvo do PATCH para uma ação do editor sobre uma tese no
 *  estado atual. Retorna null quando a ação não se aplica ao estado (defensivo;
 *  a UI só oferece as ações válidas por bloco). */
export function editorTargetState(
  action: EditorThesisAction,
  current: ThesisState,
): ThesisState | null {
  switch (action) {
    case "approve":
      return current === "pending_add" ? "included" : null;
    case "discard":
      return current === "pending_add" ? "off" : null;
    case "approveRemoval":
      return current === "pending_remove" ? "off" : null;
    case "keep":
      return current === "pending_remove" ? "included" : null;
    case "remove":
      return current === "included" ? "pending_remove" : null;
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
  /** Teses que compõem a seção "Do direito" (state ≠ off), em ordem de
   *  `position`. O editor renderiza um bloco por tese com a aprovação inline. */
  direito: Thesis[];
  /** Clique numa linha do rail — propõe a transição de estado. */
  toggle: (thesis: Thesis) => void;
  /** Ação de aprovação do editor sobre um bloco de tese (approve/discard/
   *  approveRemoval/keep/remove). Resolve o estado-alvo e dispara o PATCH. */
  editorAction: (thesis: Thesis, action: EditorThesisAction) => void;
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
  const direito = theses
    .filter((t) => isInDireito(t.state))
    .sort((a, b) => a.position - b.position);

  return {
    theses,
    isLoading: list.isLoading,
    isError: list.isError,
    selectedCount: selected.length,
    selectedIds: selected.map((t) => t.id),
    direito,
    toggle: (thesis) =>
      patch.mutate({ thesisId: thesis.id, state: nextRailState(thesis.state) }),
    editorAction: (thesis, action) => {
      const target = editorTargetState(action, thesis.state);
      if (target === null) return;
      patch.mutate({ thesisId: thesis.id, state: target });
    },
    regenerate: () => regen.mutate(),
    isRegenerating: regen.isPending,
    isTogglingId: patch.isPending ? (patch.variables?.thesisId ?? null) : null,
  };
}

export { useGenerateDraft };
