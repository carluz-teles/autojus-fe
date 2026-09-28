"use client";

import { useCallback } from "react";

import { ApiError } from "@/lib/api/errors";

import { precisaSegundoFator } from "../lib/court-catalog";
import type { CourtConnectionView } from "../types/court-connection";
import { useConnectCourtConnection } from "./use-court-connections";

export interface UseReconnectCourtConnectionArgs {
  /**
   * Chamado quando o caminho é capturar o segundo fator (QR/código) — o hook NÃO
   * abre wizard nenhum; quem o chama decide (aqui: o card abre o ConexaoWizard).
   */
  onSegundoFator?: (connection: CourtConnectionView) => void;
}

/**
 * "Reconectar" uma conexão de tribunal que caiu (DISCONNECTED / ERROR /
 * REAUTH_REQUIRED / CERTIFICATE_REQUIRED).
 *
 * Por que existe: sem este caminho, a única saída pela UI era REMOVER e recriar a
 * conexão pelo wizard — que pede o QR do 2FA outra vez, e o QR é capturado UMA vez
 * (pode não existir mais). O BE já resolve: POST /v1/court-connections/:id/connect
 * reusa o seed de MFA já selado e volta CONNECTED.
 *
 * REUSE, sem motor novo: a mutação é a `useConnectCourtConnection` que o wizard já
 * usa (mesmo endpoint, mesma invalidação da lista). O que este hook acrescenta é a
 * LEITURA do resultado, porque o connect responde 200 com o estado resultante mesmo
 * quando falha (ver internal/court/handler.go connect):
 *   CONNECTED               → sucesso
 *   AUTHENTICATING          → ainda validando (a lista repolla; não é sucesso)
 *   MFA_*_REQUIRED          → não é erro: falta o segundo fator → onSegundoFator
 *   ERROR/qualquer outro    → mostra a mensagem que o BE devolveu
 */
export function useReconnectCourtConnection({
  onSegundoFator,
}: UseReconnectCourtConnectionArgs = {}) {
  const connect = useConnectCourtConnection();
  const reconectar = useCallback(
    async (connection: CourtConnectionView) => {
      // Sem seed pra reusar: bater no connect só gastaria uma ida ao tribunal.
      if (precisaSegundoFator(connection.status)) {
        onSegundoFator?.(connection);
        return;
      }
      const atualizada = await connect
        .mutateAsync(connection.id)
        .catch(() => null);
      if (atualizada && precisaSegundoFator(atualizada.status)) {
        onSegundoFator?.(atualizada);
      }
    },
    [connect, onSegundoFator],
  );
  const resultado = connect.data ?? null;
  const conectada = resultado?.status === "CONNECTED";
  const autenticando = resultado?.status === "AUTHENTICATING";
  const erro = erroDoReconectar(connect.error, resultado);
  return {
    reconectar,
    /** Mutação em curso (`isPending` do hook — sem estado local novo). */
    isPending: connect.isPending,
    conectada,
    autenticando,
    erro,
    reset: connect.reset,
  };
}

function erroDoReconectar(
  falha: unknown,
  resultado: CourtConnectionView | null,
): string | null {
  if (falha) {
    return falha instanceof ApiError
      ? falha.message
      : "Não foi possível reconectar agora. Tente novamente.";
  }
  if (
    !resultado ||
    resultado.status === "CONNECTED" ||
    resultado.status === "AUTHENTICATING" ||
    precisaSegundoFator(resultado.status)
  ) {
    return null;
  }
  return (
    resultado.error || "Não foi possível reconectar agora. Tente novamente."
  );
}
