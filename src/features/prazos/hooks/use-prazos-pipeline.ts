"use client";

import { useMemo } from "react";

import { useActionItems } from "@/features/action-items/hooks/use-action-items";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";

import {
  buildColumns,
  buildFunil,
  type FunilEtapa,
  type PipelineColumn,
} from "../lib/pipeline";

// Janela única (sem "carregar mais" nessa tela — é quadro de trabalho, não
// histórico). Cobre o volume esperado de providências de um escritório. BUG
// PRÉ-EXISTENTE (não desta fatia): MaxLimit do BE pode truncar silenciosamente —
// paginação real é follow-up futuro.
const PIPELINE_PAGE_SIZE = 300;

// Hook público do Pipeline (Board + Funil) — ligado às providências reais
// (action_item). UMA chamada: GET /v1/action-items SEM filtro de status — o BE
// já exclui SUGGESTED incondicionalmente e retorna só TODO/WORKING/DONE, que são
// exatamente as 3 colunas. O agrupamento em 3 colunas fixas (A Fazer/Em
// elaboração/Concluída) por `status` é client-side.
//
// SOMENTE LEITURA: sem drag — a mudança de status é ação de domínio
// (iniciar/comecar/concluir), nunca por arrastar (decisão de produto travada).
export function usePrazosPipeline() {
  const directory = useOrgMembersDirectory();
  const query = useActionItems({
    pageSize: PIPELINE_PAGE_SIZE,
  });

  const colunas = useMemo<PipelineColumn[]>(
    () => buildColumns(query.providencias, directory.nameFor),
    [query.providencias, directory.nameFor],
  );

  const funil = useMemo<FunilEtapa[]>(
    () => buildFunil(query.providencias),
    [query.providencias],
  );

  return {
    isLoading: query.isPending,
    isError: !!query.error,
    colunas,
    funil,
    total: query.providencias.length.toLocaleString("pt-BR"),
  };
}
