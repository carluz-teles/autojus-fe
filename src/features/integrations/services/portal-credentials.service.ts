import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import type { PortalCredential, SavePortalCredentialInput } from "../types";

const ENDPOINT = "/v1/scraping/portal-credential";

// Camada de rede da credencial de portal (TJSP eproc). Mesmo padrão de
// integrations.service.ts: funções tipadas que recebem o fetcher, sem React.
// GET trata 404 (ENTITY_NOT_FOUND) como "não configurada" — não é erro de
// leitura, é o estado inicial legítimo do recurso.

export async function getPortalCredential(
  fetcher: ApiFetcher,
): Promise<PortalCredential | null> {
  try {
    return await fetcher<PortalCredential>(ENDPOINT);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "ENTITY_NOT_FOUND") {
      return null;
    }
    throw err;
  }
}

export async function savePortalCredential(
  fetcher: ApiFetcher,
  input: SavePortalCredentialInput,
): Promise<PortalCredential> {
  return fetcher<PortalCredential>(ENDPOINT, {
    method: "PUT",
    body: input,
  });
}

export async function removePortalCredential(
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<void>(ENDPOINT, { method: "DELETE" });
}
