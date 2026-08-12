"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPrazoPorIntimacao } from "../services/prazos.service";
import { usePrazo } from "./use-prazo";

// Estado derivado que o painel F2 consome — uma decisão única em vez de o
// componente cruzar flags de duas queries (lógica fora do JSX).
export type PrazoIntimacaoState =
  | "loading" // ainda buscando o prazo (ou seu detalhe)
  | "error" // falhou em rede
  | "empty" // intimação sem prazo derivado ainda
  | "confirmed" // prazo já OPEN/terminal — read-only
  | "pending"; // prazo PENDING com detalhe pronto — mostra o form

// Sub-hook privado (não exportado): GET /v1/prazos?intimation_id → 0 ou 1 prazo.
// Desligado enquanto não há intimação (enabled:!!id, como usePrazo).
function usePrazoPorIntimacaoQuery(intimationId: string | null) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["prazos", "por-intimacao", intimationId],
    queryFn: () => getPrazoPorIntimacao(fetcher, intimationId as string),
    enabled: !!intimationId,
  });

  return {
    prazo: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook público do painel F2. Dependent queries (React Query v5): busca o prazo da
 * intimação → com o id, busca o detalhe (traz `days`, para pré-preencher o form).
 * Compõe o sub-hook privado de listagem + o `usePrazo` existente e resolve o
 * `state` que o componente renderiza (só binding). Sem intimação, tudo fica
 * desligado (enabled:false).
 */
export function usePrazoDaIntimacao(intimationId: string | null) {
  const summary = usePrazoPorIntimacaoQuery(intimationId);
  // Só busca o detalhe quando o prazo existe E ainda está PENDING (o form precisa
  // de `days`); confirmado é read-only e o resumo já basta.
  const prazoId = summary.prazo?.status === "PENDING" ? summary.prazo.id : null;
  const detalhe = usePrazo(prazoId);

  const state: PrazoIntimacaoState = intimationId
    ? summary.isPending
      ? "loading"
      : summary.isError
        ? "error"
        : !summary.prazo
          ? "empty"
          : summary.prazo.status !== "PENDING"
            ? "confirmed"
            : detalhe.isError
              ? "error"
              : detalhe.isPending || !detalhe.prazo
                ? "loading"
                : "pending"
    : "empty";

  return {
    state,
    prazo: summary.prazo,
    detalhe: detalhe.prazo,
    error: summary.error ?? detalhe.error,
  };
}
