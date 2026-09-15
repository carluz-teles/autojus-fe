"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  connectCourtConnection,
  createCourtConnection,
  type CreateCourtConnectionInput,
  listCourtCatalog,
  listCourtConnections,
  submitMfaCode,
  submitMfaSeed,
  type SubmitMfaSeedInput,
} from "../services/court-connections.service";
import type {
  CourtConnectionView,
  MfaSeedResult,
} from "../types/court-connection";

const QUERY_KEY = ["court-connections"] as const;

/**
 * Lista as conexões com tribunais. Repolla enquanto alguma estiver AUTHENTICATING
 * (o connect pode rodar enrollment inline no BE) pra a UI refletir a transição
 * sem o usuário precisar recarregar.
 */
export function useCourtConnections() {
  const fetcher = useApi();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listCourtConnections(fetcher),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((c) => c.status === "AUTHENTICATING")
        ? 3000
        : false,
  });
}

/** Registra uma conexão (DISCONNECTED). Em sucesso invalida a lista. */
export function useCreateCourtConnection() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation<CourtConnectionView, Error, CreateCourtConnectionInput>({
    mutationFn: (input) => createCourtConnection(fetcher, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Autentica a conexão. Em sucesso invalida a lista (status muda). */
export function useConnectCourtConnection() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation<CourtConnectionView, Error, string>({
    mutationFn: (id) => connectCourtConnection(fetcher, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export interface SubmitMfaSeedArgs {
  id: string;
  input: SubmitMfaSeedInput;
}

/**
 * Envia o segundo fator (print/código). A resposta pode ser "connected" ou
 * "needs_selection" (o chamador trata o picker). Invalida a lista para reidratar
 * o status quando a conexão avança.
 */
export function useSubmitMfaSeed() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation<MfaSeedResult, Error, SubmitMfaSeedArgs>({
    mutationFn: ({ id, input }) => submitMfaSeed(fetcher, id, input),
    onSuccess: (res) => {
      if (res.kind === "connected") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    },
  });
}

export interface SubmitMfaCodeArgs {
  id: string;
  code: string;
}

/**
 * Envia o código do segundo fator por e-mail (EMAIL_CODE, ex.: e-SAJ). Em
 * sucesso invalida a lista para reidratar o status. Código inválido chega como
 * erro (kind INVALID) — o chamador trata e mantém o passo aberto.
 */
export function useSubmitMfaCode() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  return useMutation<CourtConnectionView, Error, SubmitMfaCodeArgs>({
    mutationFn: ({ id, code }) => submitMfaCode(fetcher, id, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useCourtCatalog() {
  const fetcher = useApi();
  return useQuery({
    queryKey: ["court-catalog"],
    queryFn: () => listCourtCatalog(fetcher),
    // Hoje só suportamos TJSP — filtra o catálogo do BE para não oferecer outros
    // tribunais na UI. Ponto único: os dois consumidores (ConfigTribunais e
    // useSyncAutos) leem daqui. Quando abrirmos mais tribunais, é só remover o
    // filtro (ou trocar pela allowlist real).
    select: (res) => ({
      ...res,
      data: res.data.filter((entry) => entry.court === "TJSP"),
    }),
    staleTime: 300_000,
  });
}
