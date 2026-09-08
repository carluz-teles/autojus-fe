"use client";

import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import { TRIAGEM_STAGES } from "@/features/intimacoes/hooks/use-listagem-intimacoes";

export function useTriagemCount(): number | undefined {
  const query = useIntimacoes({
    workStage: TRIAGEM_STAGES,
    user_status: "PENDING",
    limit: 1,
  });
  return query.isPending ? undefined : query.totalCount;
}
