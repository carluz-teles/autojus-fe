// Camada de rede das conexões com tribunais (eproc). Não conhece React nem cache.
//
// O certificado (A1) já é cadastrado em outra tela (Config › Certificado); aqui só
// referenciamos o id dele (certificate_ref). O segredo do segundo fator (TOTP) NUNCA
// trafega de volta: o submit envia o print (imagem do QR) ou o código colado, e o BE
// sela o seed — a resposta traz só o estado da conexão (ou a lista de contas pra
// escolher, quando o QR tem várias).

import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CourtConnectionView,
  MfaNeedsSelection,
  MfaSeedResult,
} from "../types/court-connection";

const ENDPOINT = "/v1/court-connections";

/** Lista as conexões do tenant. */
export async function listCourtConnections(
  fetcher: ApiFetcher,
): Promise<CourtConnectionView[]> {
  const raw = await fetcher<{ data: CourtConnectionView[] }>(ENDPOINT);
  return raw.data;
}

export interface CreateCourtConnectionInput {
  court: string;
  system: string;
  /** id do certificado A1 já cadastrado (Config › Certificado). */
  certificateRef: string;
}

/**
 * Registra a conexão (nasce DISCONNECTED). O connect é um passo separado —
 * assim uma primeira autenticação lenta nunca segura a resposta do create.
 */
export async function createCourtConnection(
  fetcher: ApiFetcher,
  input: CreateCourtConnectionInput,
): Promise<CourtConnectionView> {
  return fetcher<CourtConnectionView>(ENDPOINT, {
    method: "POST",
    body: {
      court: input.court,
      system: input.system,
      authentication_method: "CERTIFICATE_A1",
      certificate_ref: input.certificateRef,
    },
  });
}

/**
 * Autentica agora. Devolve o estado resultante mesmo em "falha informativa":
 * MFA_ENROLLMENT_REQUIRED significa que falta capturar o segundo fator (não é erro),
 * então o FE segue pro passo do print.
 */
export async function connectCourtConnection(
  fetcher: ApiFetcher,
  id: string,
): Promise<CourtConnectionView> {
  return fetcher<CourtConnectionView>(`${ENDPOINT}/${id}/connect`, {
    method: "POST",
  });
}

export interface SubmitMfaSeedInput {
  /** Imagem do QR (o "print" do segundo fator). Vence o `secret` quando ambos vêm. */
  qr?: File;
  /** Código/segredo colado como alternativa ao print. */
  secret?: string;
  /** Índice da conta escolhida, no reenvio após um needs_selection. */
  accountIndex?: number;
}

/**
 * Envia o segundo fator (print do QR OU código colado) em multipart. Quando o QR
 * traz mais de uma conta (ex.: export do Google Authenticator), o BE responde
 * needs_selection com os rótulos — o FE mostra o picker e REENVIA o MESMO
 * qr/secret + account_index (nada é cacheado no servidor).
 */
export async function submitMfaSeed(
  fetcher: ApiFetcher,
  id: string,
  input: SubmitMfaSeedInput,
): Promise<MfaSeedResult> {
  const fd = new FormData();
  if (input.qr) fd.append("qr", input.qr);
  if (input.secret) fd.append("secret", input.secret);
  if (input.accountIndex !== undefined) {
    fd.append("account_index", String(input.accountIndex));
  }
  const raw = await fetcher<CourtConnectionView | MfaNeedsSelection>(
    `${ENDPOINT}/${id}/mfa-seed`,
    { method: "POST", formData: fd },
  );
  if ("needs_selection" in raw && raw.needs_selection) {
    return { kind: "needs_selection", candidates: raw.candidates };
  }
  return { kind: "connected", connection: raw as CourtConnectionView };
}
