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

/**
 * Checagens que o BE consegue determinar ao parsear o .pfx na etapa de validação.
 * Contrato: POST /v1/certificates/preview → PreviewResult.checks.
 */
export interface CertificadoChecks {
  /** A janela de validade contém "agora" (não expirado nem futuro). */
  nao_expirado: boolean;
  /** O .pfx trouxe a cadeia da AC (um A1 ICP-Brasil embarca a cadeia). */
  cadeia_ok: boolean;
  /** O certificado tem um titular identificável (CN não vazio). */
  titular_confere: boolean;
}

/**
 * Resultado da pré-validação do certificado (etapa "Validação" do wizard).
 * O BE parseia o .pfx e REPORTA os metadados + checagens sem armazenar nada;
 * a senha é usada apenas para abrir o arquivo e é descartada.
 * Contrato: POST /v1/certificates/preview (multipart {file, password}).
 */
export interface CertificadoPreviewResult {
  subject_cn: string;
  oab: string;
  issuer: string;
  serial: string;
  not_before: string;
  not_after: string;
  fingerprint: string;
  checks: CertificadoChecks;
}

/**
 * Corpo do POST /v1/certificates/:id/sign. A senha é de sessão, usada apenas para
 * o BE decifrar o .pfx e assinar — nunca persistida nem logada.
 */
export interface CertificadoSignRequest {
  password: string;
  /** SHA-256 (base64) do documento a assinar, computado pelo chamador. */
  digest_sha256: string;
}

/**
 * Resposta do sign: a assinatura (base64) e a cadeia de certificados (DER base64,
 * folha primeiro). Nada aqui é segredo — a assinatura é pública por natureza.
 */
export interface CertificadoSignResult {
  signature: string;
  cert_chain: string[];
}

/** Política de quando pedir a senha do certificado (preferência do usuário, local). */
export type CertificadoPasswordPolicy = "sempre" | "sessao";

/** Escopos que o titular autoriza para o certificado. */
export interface CertificadoScope {
  assinar: boolean;
  protocolar: boolean;
  procuracoes: boolean;
}
