import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  IntegrationScope,
  IntegrationsListResponse,
  IntegrationView,
  WatchedOabsResponse,
} from "../types";

// Camada de rede para integrações de aquisição — sem React, só HTTP.
// POST /v1/acquisition/integrations = upsert TOTAL do scope (manda a lista
// completa: existentes ± a mudança). Requer role ADMIN no token.

/** Lista as integrações do tenant autenticado. */
export function getIntegrations(
  fetcher: ApiFetcher,
): Promise<IntegrationsListResponse> {
  return fetcher<IntegrationsListResponse>("/v1/acquisition/integrations");
}

/** Upsert do scope de integração DJEN — manda a lista COMPLETA de OABs. */
export function updateIntegrationScope(
  fetcher: ApiFetcher,
  scope: IntegrationScope,
): Promise<IntegrationsListResponse> {
  return fetcher<IntegrationsListResponse>("/v1/acquisition/integrations", {
    method: "POST",
    body: { scope },
  });
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
  return (
    integrations.find((i) => i.source === "DJEN")?.scope.oab ?? []
  );
}

/** OABs monitoradas com nome derivado de party_counsel. */
export function getWatchedOabs(
  fetcher: ApiFetcher,
): Promise<WatchedOabsResponse> {
  return fetcher<WatchedOabsResponse>("/v1/acquisition/watched-oabs");
}
