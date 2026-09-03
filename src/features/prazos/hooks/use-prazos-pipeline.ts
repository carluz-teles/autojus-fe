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
// histórico). Cobre o volume esperado de tarefas "peça-bound" OPEN de um
// escritório. Mesmo padrão de use-prazos-fila.ts (FILA_PAGE_SIZE).
const PIPELINE_PAGE_SIZE = 300;

// Hook público do Pipeline (Board + Funil) — ligado a TAREFAS reais, não mais
// a intimações/PrazoMock. UMA chamada: GET /v1/tasks?pipeline=true&status=OPEN
// (o BE devolve só tarefas "peça-bound" — tem draft, OU kind=PECA, OU
// action_item.gera_peca — com `pipeline_stage` preenchido). O agrupamento em 3
// colunas fixas (Elaboração/Revisão/Protocolado) é client-side.
//
// SOMENTE LEITURA: pipeline_stage é projeção pura do BE, sem campo gravável —
// decisão de produto travada, por isso não há drag (mesmo que a referência
// visual mostre cards arrastáveis).
export function usePrazosPipeline() {
  const directory = useOrgMembersDirectory();
  const query = useTasks({
    status: "OPEN",
    pipeline: true,
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
