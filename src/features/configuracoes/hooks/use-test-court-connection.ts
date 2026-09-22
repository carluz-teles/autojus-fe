"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { connectCourtConnection } from "../services/court-connections.service";

/**
 * "Testar conexão" — re-autentica a conexão (POST /:id/connect). O connect faz
 * login REAL no tribunal (cert + 2FA, TOTP auto), então sucesso = conexão
 * verificada agora. Reusa o endpoint existente; sem motor novo.
 */
export function useTestCourtConnection() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["court-connection-test"],
    mutationFn: (id: string) => connectCourtConnection(api, id),
    onSettled: () => qc.invalidateQueries({ queryKey: ["court-connections"] }),
  });
}
