"use client";

import { useMemo } from "react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { useTasks } from "@/features/tasks/hooks/use-tasks";

import {
  buildColumns,
  buildFunil,
  type FunilEtapa,
  type PipelineColumn,
} from "../lib/pipeline";

// Janela única (sem "carregar mais" nessa tela — é quadro de trabalho, não
// histórico). Cobre o volume esperado de TODAS as tarefas (não só peça-bound)
// de um escritório. Mesmo padrão de use-prazos-fila.ts (FILA_PAGE_SIZE). BUG
// PRÉ-EXISTENTE (não desta fatia): MaxLimit=100 do BE trunca silenciosamente —
// paginação real é follow-up futuro (Architect já sinalizou).
const PIPELINE_PAGE_SIZE = 300;

// Hook público do Pipeline (Board + Funil) — ligado a TODAS as tarefas reais
// (não só peça-bound), não mais a intimações/PrazoMock. UMA chamada: GET
// /v1/tasks SEM filtro de status — o BE já exclui DISMISSED incondicionalmente
// (ListTasks: "DISMISSED is always excluded"), e como a 4ª coluna (Concluída)
// É o estado DONE, um filtro `status=OPEN` esconderia a própria coluna que
// queremos mostrar. `stage` vem preenchido em cada item (sempre presente, sem
// omitempty). O agrupamento em 4 colunas fixas (A Fazer/Elaboração/Revisão/
// Concluída) é client-side.
//
// SOMENTE LEITURA: stage é projeção pura do BE, sem campo gravável — decisão
// de produto travada, por isso não há drag (mesmo que a referência visual
// mostre cards arrastáveis).
export function usePrazosPipeline() {
  const directory = useOrgMembersDirectory();
  const query = useTasks({
    pageSize: PIPELINE_PAGE_SIZE,
  });

  const colunas = useMemo<PipelineColumn[]>(
    () => buildColumns(query.tarefas, directory.nameFor),
    [query.tarefas, directory.nameFor],
  );

  const funil = useMemo<FunilEtapa[]>(
    () => buildFunil(query.tarefas),
    [query.tarefas],
  );

  return {
    isLoading: query.isPending,
    isError: !!query.error,
    colunas,
    funil,
    total: query.tarefas.length.toLocaleString("pt-BR"),
  };
}
