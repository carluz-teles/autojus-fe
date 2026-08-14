"use client";

import { useTarefasSugeridas } from "@/features/prazos/hooks/use-tarefas-sugeridas";
import type { PrazoAgendaView } from "@/features/prazos/types";

import {
  type AnaliseTaskContext,
  useAnaliseTarefas,
} from "./use-analise-tarefas";

/**
 * Hook público da seção "Análise da IA". Compõe os sub-hooks `_private` do fluxo:
 * useTarefasSugeridas (server state do LLM) + useAnaliseTarefas (estado local dos cards
 * e mutations). O componente chama só este hook — a regra do CLAUDE.md é hook público
 * compõe sub-hooks, componente = JSX + binding.
 */
export function useAnalise(prazo: PrazoAgendaView) {
  const { data, isLoading, isError } = useTarefasSugeridas(prazo.id);

  const tarefas = useAnaliseTarefas({
    tasks: data?.suggested_tasks ?? [],
    context: toContext(prazo),
  });

  return {
    summary: data?.summary?.trim(),
    recommendation: data?.recommendation?.trim(),
    isLoading,
    isError,
    ...tarefas,
  };
}

// Converte o prazo (vindo do F2/agenda) no contexto que liga cada tarefa ao prazo de
// origem — os FKs do POST /v1/tasks. `end_date` é o vencimento default dos cards.
function toContext(prazo: PrazoAgendaView): AnaliseTaskContext {
  return {
    deadlineId: prazo.id,
    intimationId: prazo.intimation_id,
    courtRecordId: prazo.court_record_id,
    defaultDueDate: prazo.end_date,
  };
}
