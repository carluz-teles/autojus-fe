"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { connectCourtConnection } from "../services/court-connections.service";
import type { CourtConnectionView } from "../types/court-connection";
import { COURT_CONNECTIONS_QUERY_KEY } from "./use-court-connections";

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
    onSuccess: (connection) => {
      qc.setQueryData<CourtConnectionView[]>(
        COURT_CONNECTIONS_QUERY_KEY,
        (current) =>
          current?.map((item) =>
            item.id === connection.id ? connection : item,
          ),
      );
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: COURT_CONNECTIONS_QUERY_KEY }),
  });
}
