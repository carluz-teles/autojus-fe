"use client";

import {
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import {
  autosSyncFeedback,
  type AutosSyncScope,
  autosSyncTargets,
  summarizeAutosSync,
} from "../lib/autos-sync";
import {
  getCourtAutosSyncStatus,
  syncCourtAutos,
} from "../services/court-connections.service";
import { useCourtCatalog, useCourtConnections } from "./use-court-connections";

export function useSyncAutos(scope: AutosSyncScope) {
  const api = useApi();
  const queryClient = useQueryClient();
  const catalog = useCourtCatalog();
  const connections = useCourtConnections();
  const targets = autosSyncTargets(
    catalog.data?.data ?? [],
    connections.data ?? [],
    scope,
  );
  const refreshDocuments = () =>
    queryClient.invalidateQueries({
      queryKey: [
        "documentos",
        "processo",
        ...(scope.courtRecordId ? [scope.courtRecordId] : []),
      ],
    });
  const statusKey = [
    "court-autos-sync",
    scope.courtRecordId ?? "all",
    ...targets.map((t) => t.id).sort(),
  ];
  const status = useQuery({
    queryKey: statusKey,
    enabled: targets.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        targets.map((c) =>
          getCourtAutosSyncStatus(api, c.id, scope.courtRecordId),
        ),
      );
      return summarizeAutosSync(results);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
  const requesting =
    useIsMutating({ mutationKey: ["court-autos-sync-request"] }) > 0;
  const refreshingDocuments =
    useIsFetching({
      queryKey: [
        "documentos",
        "processo",
        ...(scope.courtRecordId ? [scope.courtRecordId] : []),
      ],
    }) > 0;
  const mutation = useMutation({
    mutationKey: ["court-autos-sync-request"],
    mutationFn: async () => {
      const results = await Promise.allSettled(
        targets.map((c) => syncCourtAutos(api, c.id, scope.courtRecordId)),
      );
      const accepted = results.filter((r) => r.status === "fulfilled");
      const failures = results.flatMap((r, i) =>
        r.status === "rejected"
          ? [
              `${targets[i].court}: ${r.reason instanceof ApiError ? r.reason.message : "não foi possível solicitar a busca"}`,
            ]
          : [],
      );
      if (!accepted.length)
        throw new Error(
          failures.join(". ") ||
            "Conecte o eproc do tribunal para sincronizar os autos.",
        );
      return {
        ...summarizeAutosSync(accepted.map((result) => result.value)),
        failures,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, result);
      void queryClient.invalidateQueries({ queryKey: ["court-autos-sync"] });
      void refreshDocuments();
    },
    onError: () => {
      void connections.refetch();
    },
  });
  const pending = status.data?.status === "pending";
  const failed =
    status.data?.status === "failed" || (status.data?.failed ?? 0) > 0;
  const feedback =
    status.data && !status.isError
      ? autosSyncFeedback(status.data, mutation.data)
      : null;
  const reason =
    catalog.isError || connections.isError
      ? "Não foi possível verificar as conexões. Tente recarregar a página."
      : catalog.isPending || connections.isPending
        ? "Verificando conexão com o tribunal…"
        : scope.courtRecordId && !["G1", "JE"].includes(scope.degree ?? "")
          ? "O grau deste processo não está na cobertura da integração disponível."
          : !targets.length
            ? "Conecte o tribunal com certificado e 2FA para buscar os autos."
            : status.isPending
              ? "Verificando buscas em andamento…"
              : status.isError
                ? "Não foi possível verificar a busca. Aguarde uma nova tentativa."
                : pending
                  ? "Já existe uma busca de autos pendente para este processo ou conexão."
                  : undefined;
  return {
    mutation,
    reason,
    refreshDocuments,
    pending,
    failed,
    feedback,
    requesting,
    refreshingDocuments,
  };
}
