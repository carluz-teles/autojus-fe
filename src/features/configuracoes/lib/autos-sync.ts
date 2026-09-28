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
  // UNKNOWN é o grau de descoberta (DJEN nunca revela o grau — degree=UNKNOWN até
  // o DATAJUD enriquecer, ver internal/acquisition/enrichment.go) — não uma prova
  // de portal incompatível. Incluí-lo aqui NÃO amplia suporte: o filtro por
  // court+system+catalog abaixo continua sendo a única autoridade sobre QUAL
  // portal sincroniza autos (A2). G2/SUPERIOR continuam de fora (não fazem parte
  // do achado A1 — sem evidência de que esses graus tenham suporte de autos).
  if (
    scope.courtRecordId &&
    !["G1", "JE", "UNKNOWN"].includes(scope.degree ?? "")
  )
    return [];
  const seen = new Set<string>();
  return connections.filter((c) => {
    if (
      c.status !== "CONNECTED" ||
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
  /** Quantos processos da cobertura da conexão a sincronização VIU (materializou).
   *  Fato DIFERENTE de `queued` (quantos passaram pelo gate e vão ser buscados) —
   *  é a diferença que deixa a UI dizer "achei seu acervo e nada precisa de autos
   *  agora" em vez de "não achei nada" (BE: AutosSyncResult.Discovered em
   *  internal/court/manual_sync.go). Só o POST de sincronização a preenche; o GET
   *  de status devolve 0 (nada foi descoberto ao só consultar). Opcional porque é
   *  aditivo ao contrato: uma resposta antiga sem o campo continua válida. */
  discovered?: number;
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
    discovered: results.reduce((sum, item) => sum + (item.discovered ?? 0), 0),
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

/** "N processos" / "1 processo" — a contagem aparece na cópia, então o plural também. */
function contagemProcessos(total: number) {
  return `${total} ${total === 1 ? "processo" : "processos"}`;
}

export function autosSyncFeedback(
  status: AutosSyncStatus,
  request?: {
    queued: number;
    pending: number;
    discovered?: number;
    failures: string[];
  },
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
  // Acervo encontrado, nada enfileirado: o BE achou os processos da conexão e o gate
  // de necessidade não admitiu nenhum (discovered > 0, queued = 0, status "idle").
  // Dizer isso com os NÚMEROS é o ponto — o silêncio faz o usuário achar que o botão
  // não funcionou. E nada de prometer busca: não há nada na fila.
  if (request && (request.discovered ?? 0) > 0)
    return {
      failed: false,
      title: "Nenhum processo precisa dos autos agora",
      description: `Verificamos ${contagemProcessos(request.discovered ?? 0)} desta conexão e nenhum precisa dos autos neste momento — nada foi solicitado ao tribunal. Os autos são buscados quando um prazo ou uma nova publicação exige.`,
    };
  return {
    failed: false,
    title: "Nenhum processo para sincronizar",
    description: "Nenhum processo encontrado na cobertura desta conexão.",
  };
}
