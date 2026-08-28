// Camada de rede da credencial e-SAJ. Não conhece React nem cache.
//
// Contrato real do BE:
//   POST   /v1/esaj-credentials              → 201 EsajCredentialView
//   GET    /v1/esaj-credentials              → { data: EsajCredentialView[] }
//   DELETE /v1/esaj-credentials/:id          → 204
//
// A senha trafega apenas para o BE cifrá-la no cofre KMS; nunca volta em
// nenhuma leitura. Usada pelo worker-filing (RPA e-SAJ, ainda em calibração —
// ver docs/erd-execucao-judicial-tjsp.md §16) pra protocolar automaticamente.

import type { ApiFetcher } from "@/lib/api/use-api";

import type { EsajCredentialView } from "../types/esaj-credential";

const ENDPOINT = "/v1/esaj-credentials";

export interface UploadEsajCredentialInput {
  login: string;
  /** Enviada apenas para o BE cifrar no cofre KMS. Nunca volta, não logar. */
  password: string;
  termsVersion: string;
}

/** Cadastra a credencial e-SAJ do advogado — POST /v1/esaj-credentials. */
export async function uploadEsajCredential(
  fetcher: ApiFetcher,
  input: UploadEsajCredentialInput,
): Promise<EsajCredentialView> {
  const res = await fetcher<{ data: EsajCredentialView }>(ENDPOINT, {
    method: "POST",
    body: {
      login: input.login,
      password: input.password,
      terms_version: input.termsVersion,
    },
  });
  return res.data;
}

/** Lista as credenciais e-SAJ ativas do tenant. */
export async function listEsajCredentials(
  fetcher: ApiFetcher,
): Promise<EsajCredentialView[]> {
  const res = await fetcher<{ data: EsajCredentialView[] }>(ENDPOINT);
  return res.data;
}

/** Revoga (soft-delete) a credencial e-SAJ. */
export async function revokeEsajCredential(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}`, { method: "DELETE" });
}
