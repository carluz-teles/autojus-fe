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
  | "pending" // prazo PENDING com detalhe pronto — mostra o read-only sugerido
  | "editing" // modo formulário de ajuste (estado local do componente)
  | "confirmed" // prazo já OPEN — read-only com auditoria
  | "no_deadline"; // mera ciência — NO_DEADLINE com auditoria

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
 *
 * Estados:
 *   - "loading"    → ainda buscando
 *   - "error"      → falha de rede
 *   - "empty"      → sem prazo derivado ainda
 *   - "pending"    → PENDING: painel sugerido (read-only), aguarda decisão humana
 *   - "confirmed"  → OPEN: confirmado, com auditoria (confirmed_by_name + confirmed_at)
 *   - "no_deadline"→ NO_DEADLINE: mera ciência, com auditoria
 */
export function usePrazoDaIntimacao(intimationId: string | null) {
  const summary = usePrazoPorIntimacaoQuery(intimationId);
  // Busca detalhe quando o prazo existe E está em estado que exige form (PENDING).
  // OPEN e NO_DEADLINE não precisam do detalhe — o summary já tem auditoria.
  const prazoId = summary.prazo?.status === "PENDING" ? summary.prazo.id : null;
  const detalhe = usePrazo(prazoId);

  const state: PrazoIntimacaoState = intimationId
    ? summary.isPending
      ? "loading"
      : summary.isError
        ? "error"
        : !summary.prazo
          ? "empty"
          : summary.prazo.status === "NO_DEADLINE"
            ? "no_deadline"
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
