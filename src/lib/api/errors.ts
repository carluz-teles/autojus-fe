// Formato único de erro do BE: { kind, message, details }. Toda falha de rede/HTTP
// vira ApiError — ÚNICA fonte de parse (services/hooks nunca inspecionam Response cru).

export type ApiErrorKind =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ENTITY_NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NETWORK"
  | "UNKNOWN";

interface ApiErrorBody {
  kind?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }

  get isAuth() {
    return this.kind === "UNAUTHENTICATED" || this.status === 401;
  }
}

const KNOWN_KINDS: ReadonlySet<string> = new Set<ApiErrorKind>([
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ENTITY_NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
  "NETWORK",
  "UNKNOWN",
]);

// O BE (lib/apperr) serializa seus Kind com nomes próprios que nem sempre batem
// 1:1 com os nossos ApiErrorKind semânticos. Mapeia os divergentes. O caso crítico
// é KindInvalid ("DOMAIN_ERROR_INVALID"), que vem em HTTP 400 — status sem fallback
// abaixo, então sem este alias viraria "UNKNOWN" e as mensagens de validação
// (ex.: "Gere a minuta antes de revisar") não apareceriam. Os demais também
// recuperariam pelo status, mas mapear pelo kind é mais robusto.
const BE_KIND_ALIASES: Record<string, ApiErrorKind> = {
  DOMAIN_ERROR_INVALID: "VALIDATION",
  AUTHENTICATION_ERROR: "UNAUTHENTICATED",
  AUTHORIZATION_ERROR: "FORBIDDEN",
  INFRA_ERROR: "INTERNAL",
  SERVICE_UNAVAILABLE: "INTERNAL",
};

function normalizeKind(kind: string | undefined, status: number): ApiErrorKind {
  if (kind && BE_KIND_ALIASES[kind]) return BE_KIND_ALIASES[kind];
  if (kind && KNOWN_KINDS.has(kind)) return kind as ApiErrorKind;
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "ENTITY_NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL";
  return "UNKNOWN";
}

/** Constrói ApiError a partir de uma Response não-ok, lendo o corpo {kind,message,details}. */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // corpo vazio / não-JSON — cai no fallback por status
  }
  const kind = normalizeKind(body.kind, res.status);
  const message =
    body.message?.trim() || res.statusText || "Erro na requisição";
  return new ApiError(kind, message, res.status, body.details);
}

/** Falha de transporte (fetch rejeitou: offline, DNS, CORS). */
export function networkError(cause: unknown): ApiError {
  const message = cause instanceof Error ? cause.message : "Falha de conexão";
  return new ApiError("NETWORK", message, 0, cause);
}
