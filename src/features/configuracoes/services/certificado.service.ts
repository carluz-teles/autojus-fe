// Camada de rede do certificado A1. Não conhece React nem cache.
//
// Contrato real do BE:
//   POST   /v1/certificates   multipart/form-data: file (.pfx/.p12) + password
//                              → 201 CertificateView (BE parseia, valida cadeia e DESCARTA a senha)
//   GET    /v1/certificates   → { data: CertificateView[] }
//   PATCH  /v1/certificates/:id/password-policy → { password_policy } → CertificateView
//   POST   /v1/certificates/:id/sign → { password?, digest_sha256 } → CertificadoSignResult
//   DELETE /v1/certificates/:id → 204
//
// A senha trafega APENAS para o BE abrir o PKCS#12 e extrair metadados; nunca é
// persistida. "A assinatura é feita localmente; a senha não é armazenada."
//
// `password_policy` chega da wire em inglês ("always"/"session"/"never") — é
// este o único ponto de contato com o BE, então é aqui que traduzimos pro
// vocabulário do FE (`mapCertificateView`, em ../types/certificado).

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  type CertificadosListResult,
  type CertificateView,
  type CertificateViewApi,
  mapCertificateView,
} from "../types/certificado";

const ENDPOINT = "/v1/certificates";

/**
 * Faz o upload do certificado A1 via multipart/form-data.
 * A senha é enviada para que o BE abra o PKCS#12 — é descartada logo após a
 * validação. Nunca persistida, nunca logada.
 */
export async function uploadCertificado(
  fetcher: ApiFetcher,
  file: File,
  password: string,
): Promise<CertificateView> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("password", password);
  const raw = await fetcher<CertificateViewApi>(ENDPOINT, {
    method: "POST",
    formData: fd,
  });
  return mapCertificateView(raw);
}

/** Lista os certificados do tenant (o do usuário corrente é owner_user_id = meu ID). */
export async function listCertificados(
  fetcher: ApiFetcher,
): Promise<CertificadosListResult> {
  const raw = await fetcher<{ data: CertificateViewApi[] }>(ENDPOINT);
  return { data: raw.data.map(mapCertificateView) };
}

/** Remove / revoga o certificado. O BE devolve 204. */
export async function deleteCertificado(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}`, { method: "DELETE" });
}
