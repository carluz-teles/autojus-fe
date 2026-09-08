import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "../types/court-connection";

export interface AutosSyncScope {
  connectionId?: string;
  court?: string;
  courtRecordId?: string;
  degree?: string;
}

export function autosSyncTargets(
  catalog: CourtCatalogEntry[],
  connections: CourtConnectionView[],
  scope: AutosSyncScope,
) {
  if (scope.courtRecordId && !["G1", "JE"].includes(scope.degree ?? ""))
    return [];
  const seen = new Set<string>();
  return connections.filter((c) => {
    if (
      c.status !== "CONNECTED" ||
      c.system !== "EPROC" ||
      (scope.court && c.court !== scope.court) ||
      (scope.connectionId && c.id !== scope.connectionId)
    )
      return false;
    const key = `${c.court}:${c.system}`;
    if (
      seen.has(key) ||
      !catalog.some(
        (entry) =>
          entry.available &&
          entry.connection_mode !== "PER_OPERATION" &&
          (!entry.capabilities || entry.capabilities.includes("SYNC_AUTOS")) &&
          entry.court === c.court &&
          entry.system === c.system,
      )
    )
      return false;
    seen.add(key);
    return true;
  });
}

export interface AutosSyncStatus {
  queued: number;
  pending: number;
  failed: number;
  status: "idle" | "pending" | "failed";
  error?: string;
}

/** Pending work wins while another tribunal is still running; terminal failures
 * remain visible after reload and never masquerade as successful completion. */
export function summarizeAutosSync(
  results: AutosSyncStatus[],
): AutosSyncStatus {
  const pending = results.reduce((sum, item) => sum + (item.pending ?? 0), 0);
  const failed = results.reduce((sum, item) => sum + (item.failed ?? 0), 0);
  const errors = [
    ...new Set(results.flatMap((item) => (item.error ? [item.error] : []))),
  ];
  return {
    queued: results.reduce((sum, item) => sum + (item.queued ?? 0), 0),
    pending,
    failed,
    status:
      pending > 0 || results.some((item) => item.status === "pending")
        ? "pending"
        : failed > 0 || results.some((item) => item.status === "failed")
          ? "failed"
          : "idle",
    error: errors.length ? errors.join(" ") : undefined,
  };
}

export function autosSyncFeedback(
  status: AutosSyncStatus,
  request?: { queued: number; pending: number; failures: string[] },
) {
  if (status.status === "pending")
    return {
      failed: false,
      title: "Busca de autos em andamento",
      description:
        "A solicitação está na fila ou em processamento. Novas buscas ficam bloqueadas até a conclusão.",
      error: status.error,
    };
  if (status.failed > 0 || status.status === "failed")
    return {
      failed: true,
      title: "Busca de autos interrompida",
      description:
        status.error ||
        "A busca dos autos foi interrompida após várias tentativas. Tente novamente.",
    };
  if (request?.failures.length)
    return {
      failed: true,
      title: "Não foi possível concluir todas as buscas",
      description:
        "Parte das solicitações não foi aceita. Tente novamente para buscar os autos restantes.",
    };
  if (request && (request.queued > 0 || request.pending > 0))
    return {
      failed: false,
      title: "Busca de autos finalizada",
      description:
        "A busca foi concluída. Atualize a lista para consultar os documentos disponíveis.",
    };
  return {
    failed: false,
    title: "Nenhum processo para sincronizar",
    description: "Nenhum processo encontrado na cobertura desta conexão.",
  };
}
