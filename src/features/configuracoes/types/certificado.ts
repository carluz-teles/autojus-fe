// Tipos do certificado digital (e-CPF A1) — alinhados ao contrato real do BE.
//
// Upload: POST /v1/certificates — multipart/form-data com `file` (.pfx/.p12) e
// `password`. O BE parseia/valida o arquivo e DESCARTA a senha; ela serve apenas
// para o BE abrir o PKCS#12 e extrair os metadados. "A assinatura é feita
// localmente; a senha não é armazenada."
//
// Leitura: GET /v1/certificates → { data: CertificateView[] }
// Remoção: DELETE /v1/certificates/:id → 204

/** Metadados do certificado devolvidos pelo BE (nunca o arquivo nem a senha). */
export interface CertificateView {
  id: string;
  /** Common Name do titular (ex.: "LUAN GOMES"). */
  subject_cn: string;
  /** OAB do titular (ex.: "347019/SP"). */
  oab: string;
  /** Nome da autoridade certificadora. */
  issuer: string;
  /** Número de série do certificado. */
  serial: string;
  /** Início de validade (RFC3339). */
  not_before: string;
  /** Fim de validade (RFC3339). */
  not_after: string;
  /** Impressão digital SHA-256 (hex com ":"). */
  fingerprint: string;
  /** ID do usuário titular no sistema. */
  owner_user_id: string;
  /** Nome display do titular (pode ser omitido). */
  owner_user_name?: string;
  /** Quando o certificado foi cadastrado (RFC3339). */
  created_at: string;
  /** Quando foi revogado/removido, se aplicável. */
  revoked_at: string | null;
}

/** Envelope de lista devolvido pelo GET /v1/certificates. */
export interface CertificadosListResult {
  data: CertificateView[];
}

/** Política de quando pedir a senha do certificado (preferência do usuário, local). */
export type CertificadoPasswordPolicy = "sempre" | "sessao";

/** Escopos que o titular autoriza para o certificado. */
export interface CertificadoScope {
  assinar: boolean;
  protocolar: boolean;
  procuracoes: boolean;
}
