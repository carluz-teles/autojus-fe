// Tipos da conexão com tribunal (eproc) — alinhados ao contrato real do BE.
//
// Uma conexão liga o advogado a UMA instância de um sistema de tribunal (ex.:
// TJSP/EPROC). Autentica com o certificado A1 já cadastrado + um segundo fator
// (TOTP) capturado uma única vez. O modelo é por-tribunal: cada eproc (TJSP,
// TJRS, TRF4…) é uma instância isolada e teria a sua própria conexão.
//
// Contrato do BE:
//   POST   /v1/court-connections            {court, system, authentication_method, certificate_ref} → CourtConnectionView
//   GET    /v1/court-connections            → { data: CourtConnectionView[] }
//   POST   /v1/court-connections/:id/connect → CourtConnectionView (status pode virar MFA_ENROLLMENT_REQUIRED)
//   POST   /v1/court-connections/:id/mfa-seed (multipart: qr|secret [+account_index]) → CourtConnectionView | MfaNeedsSelection

/** Estados possíveis de uma conexão (espelha o Status do slice court no BE). */
export type CourtConnectionStatus =
  | "DISCONNECTED"
  | "AUTHENTICATING"
  | "CONNECTED"
  | "MFA_ENROLLMENT_REQUIRED"
  | "MFA_REQUIRED"
  | "CERTIFICATE_REQUIRED"
  | "REAUTH_REQUIRED"
  | "ERROR";

/** Uma conexão como o BE a devolve (nunca segredo/seed/sessão). */
export interface CourtConnectionView {
  id: string;
  /** Tribunal (ex.: "TJSP"). */
  court: string;
  /** Sistema do tribunal (ex.: "EPROC"). */
  system: string;
  /** Método de autenticação (hoje "CERTIFICATE_A1"). */
  authentication_method: string;
  status: CourtConnectionStatus;
  /** Última autenticação bem-sucedida (RFC3339), quando houver. */
  last_authenticated_at?: string | null;
  /** Mensagem de erro da última tentativa, quando status = ERROR. */
  error?: string;
  created_at: string;
}

/** Uma conta candidata quando o QR trouxe mais de um TOTP (ex.: export do Google Authenticator). */
export interface MfaSelectionCandidate {
  index: number;
  /** Rótulo legível (issuer/nome) — nunca o segredo. */
  label: string;
}

/** Resposta do mfa-seed quando o upload foi válido mas ambíguo (>1 conta). */
export interface MfaNeedsSelection {
  needs_selection: true;
  candidates: MfaSelectionCandidate[];
}

/**
 * Resultado normalizado do submit do segundo fator: ou a conexão avançou
 * (tipicamente CONNECTED), ou o BE pede pra escolher entre várias contas.
 */
export type MfaSeedResult =
  | { kind: "connected"; connection: CourtConnectionView }
  | { kind: "needs_selection"; candidates: MfaSelectionCandidate[] };
