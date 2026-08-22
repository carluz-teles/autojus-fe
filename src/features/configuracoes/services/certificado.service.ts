// Camada de rede do certificado A1. Não conhece React nem cache.
//
// Contrato real do BE:
//   POST   /v1/certificates   multipart/form-data: file (.pfx/.p12) + password
//                              → 201 CertificateView (BE parseia, valida cadeia e DESCARTA a senha)
//   GET    /v1/certificates   → { data: CertificateView[] }
//   DELETE /v1/certificates/:id → 204
//
// A senha trafega APENAS para o BE abrir o PKCS#12 e extrair metadados; nunca é
// persistida. "A assinatura é feita localmente; a senha não é armazenada."

import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CertificadoPreviewResult,
  CertificadoSignResult,
  CertificadosListResult,
  CertificateView,
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
  return fetcher<CertificateView>(ENDPOINT, { method: "POST", formData: fd });
}

/**
 * Pré-valida o certificado (etapa "Validação" do wizard) SEM armazenar nada.
 * O BE parseia o .pfx, extrai os metadados e devolve as checagens (✓/✗). A senha
 * é usada apenas para abrir o arquivo e é descartada — nunca persistida, nunca
 * logada. Mesmo shape multipart do upload.
 */
export async function previewCertificado(
  fetcher: ApiFetcher,
  file: File,
  password: string,
): Promise<CertificadoPreviewResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("password", password);
  return fetcher<CertificadoPreviewResult>(`${ENDPOINT}/preview`, {
    method: "POST",
    formData: fd,
  });
}

/**
 * Assina um digest SHA-256 (base64) server-side com a chave do certificado. A
 * senha é de sessão, usada apenas para o BE decifrar o .pfx e assinar — nunca
 * persistida nem logada. Devolve {signature, cert_chain} (base64).
 */
export async function signComCertificado(
  fetcher: ApiFetcher,
  id: string,
  password: string,
  digestSha256: string,
): Promise<CertificadoSignResult> {
  return fetcher<CertificadoSignResult>(`${ENDPOINT}/${id}/sign`, {
    method: "POST",
    body: { password, digest_sha256: digestSha256 },
  });
}

/** Lista os certificados do tenant (o do usuário corrente é owner_user_id = meu ID). */
export async function listCertificados(
  fetcher: ApiFetcher,
): Promise<CertificadosListResult> {
  return fetcher<CertificadosListResult>(ENDPOINT);
}

/** Remove / revoga o certificado. O BE devolve 204. */
export async function deleteCertificado(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}`, { method: "DELETE" });
}
