import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  IntegrationsListResponse,
  IntegrationView,
  WatchedOabsResponse,
  WatchedOabToggle,
} from "../types";

// Camada de rede para integrações de aquisição — sem React, só HTTP.

/** Lista as integrações do tenant autenticado. */
export function getIntegrations(
  fetcher: ApiFetcher,
): Promise<IntegrationsListResponse> {
  return fetcher<IntegrationsListResponse>("/v1/acquisition/integrations");
}

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

/** Lookup de nome por OAB (ex.: "SP123456"). Pode dar 404/501/503 — o chamador
 * deve fazer fallback para a própria OAB como nome. */
export async function lookupOabName(
  fetcher: ApiFetcher,
  oab: string,
): Promise<string> {
  const res = await fetcher<{ oab: string; name: string }>(
    "/v1/acquisition/oab-lookup",
    { query: { oab } },
  );
  return res.name;
}

/** Extrai as OABs monitoradas da lista de integrações (source === "DJEN"). */
export function extractDjenOabs(integrations: IntegrationView[]): string[] {
  return integrations.find((i) => i.source === "DJEN")?.scope.oab ?? [];
}

/** OABs monitoradas com nome derivado de party_counsel. */
export function getWatchedOabs(
  fetcher: ApiFetcher,
): Promise<WatchedOabsResponse> {
  return fetcher<WatchedOabsResponse>("/v1/acquisition/watched-oabs");
}
