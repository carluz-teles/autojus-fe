import type { ApiFetcher } from "@/lib/api/use-api";

import type { WatchedOabsResponse, WatchedOabToggle } from "../types";

// Camada de rede para integrações de aquisição — sem React, só HTTP.

/** Adiciona 1 OAB ao monitoramento (chave canônica "UFNUMERO"). Nasce habilitada;
 * dispara a captura nas próximas rodadas do DJEN. Requer role ADMIN no token. */
export function addWatchedOab(
  fetcher: ApiFetcher,
  oab: string,
): Promise<WatchedOabToggle> {
  return fetcher<WatchedOabToggle>("/v1/acquisition/watched-oabs", {
    method: "POST",
    body: { oab },
  });
}

/** Liga/desliga a captura de 1 OAB já monitorada. Ligar dispara automaticamente
 * uma varredura de catch-up no BE. Requer role ADMIN no token. */
export function toggleWatchedOab(
  fetcher: ApiFetcher,
  oab: string,
  enabled: boolean,
): Promise<WatchedOabToggle> {
  return fetcher<WatchedOabToggle>(
    `/v1/acquisition/watched-oabs/${encodeURIComponent(oab)}`,
    { method: "PATCH", body: { enabled } },
  );
}

/** OABs monitoradas com nome derivado de party_counsel. */
export function getWatchedOabs(
  fetcher: ApiFetcher,
): Promise<WatchedOabsResponse> {
  return fetcher<WatchedOabsResponse>("/v1/acquisition/watched-oabs");
}
