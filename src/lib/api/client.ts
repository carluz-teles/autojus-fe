import {
  isAIRequest,
  recordAIExperience,
  rememberAIRequest,
} from "../telemetry/ai-experience";
import { apiErrorFromResponse, networkError } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Obtém o JWT do Clerk. No cliente: useAuth().getToken; no server: auth().getToken. */
type TokenGetter = () => Promise<string | null | undefined>;

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Valor que o interceptor serializa como JSON (não usar com FormData). */
  body?: unknown;
  /** JSON já serializado, preservado byte a byte. Exclusivo com body/formData. */
  serializedJson?: string;
  /**
   * Enviado como multipart/form-data. Exclui `body`.
   * O browser define o Content-Type + boundary automaticamente — NÃO setar
   * manualmente. Usar para uploads pequenos diretos ao BE (ex.: certificado A1).
   */
  formData?: FormData;
  /** Query string. Valores undefined/null são omitidos. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Injeta Authorization: Bearer <jwt>. O BE resolve org_id→tenant_id. */
  getToken?: TokenGetter;
}

function buildUrl(path: string, query?: ApiRequest["query"]): string {
  const url = new URL(
    path.replace(/^\//, ""),
    `${BASE_URL.replace(/\/$/, "")}/`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Fetch tipado + interceptor. ÚNICO ponto de contato com o BE:
 * monta URL/headers, anexa o JWT, e converte qualquer falha em ApiError.
 */
async function apiResponse(
  path: string,
  req: ApiRequest,
  policy: {
    accept?: string;
    privateBinary?: boolean;
    observeAI?: boolean;
  } = {},
): Promise<Response> {
  const started = typeof window === "undefined" ? 0 : performance.now();
  const {
    method = "GET",
    body,
    serializedJson,
    formData,
    query,
    signal,
    headers,
    getToken,
  } = req;

  if (
    serializedJson !== undefined &&
    (body !== undefined || formData !== undefined)
  )
    throw new TypeError(
      "Use somente um corpo: body, serializedJson ou formData.",
    );

  const finalHeaders: Record<string, string> = {
    Accept: policy.accept ?? "application/json",
    ...headers,
  };
  // Para JSON body: define Content-Type. Para FormData: NÃO definir — o browser
  // inclui o boundary automaticamente. São mutuamente exclusivos.
  if (
    (body !== undefined || serializedJson !== undefined) &&
    formData === undefined
  ) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (getToken) {
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (formData !== undefined) {
    fetchBody = formData;
  } else if (serializedJson !== undefined) {
    fetchBody = serializedJson;
  } else if (body !== undefined) {
    fetchBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: fetchBody,
      signal,
      ...(policy.privateBinary
        ? { redirect: "error" as const, cache: "no-store" as const }
        : {}),
    });
  } catch (cause) {
    throw networkError(cause);
  }

  if (policy.observeAI && isAIRequest(path, method)) {
    const operationId = res.headers.get("X-AI-Operation-ID");
    if (operationId) rememberAIRequest(path, operationId, started);
    if (operationId && !res.ok) {
      recordAIExperience(path, "error", (event) =>
        fetch(buildUrl("/v1/ai/experience-events"), {
          method: "POST",
          headers: { ...finalHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(2000),
        }),
      );
    }
  }
  if (!res.ok) throw await apiErrorFromResponse(res);

  return res;
}
export async function apiFetch<T>(
  path: string,
  req: ApiRequest = {},
): Promise<T> {
  const res = await apiResponse(path, req, { observeAI: true });
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Variante do apiFetch para respostas BINÁRIAS (ex.: bytes de PDF de um auto).
 * Mesmo interceptor (URL/headers/JWT/erro tipado), mas devolve o Blob em vez de
 * fazer res.json(). O caller costuma virar um object URL (URL.createObjectURL)
 * para embutir num <object>/<iframe> — assim o token nunca vai na URL.
 */
export async function apiFetchBlob(
  path: string,
  req: ApiRequest = {},
): Promise<Blob> {
  const res = await apiResponse(
    path,
    {
      ...req,
      method: "GET",
      body: undefined,
      serializedJson: undefined,
      formData: undefined,
    },
    { accept: "*/*" },
  );
  return res.blob();
}

export interface ApiBinaryRequest extends ApiRequest {
  maxBytes: number;
  expectedContentType: string;
  responseHeaders?: string[];
}
export interface ApiBinaryResult {
  blob: Blob;
  headers: Record<string, string>;
}

// Bounded, explicit private transfers. No Response or bearer token escapes this
// interceptor, and a redirect cannot silently repeat a POST at another origin.
export async function apiFetchBinary(
  path: string,
  req: ApiBinaryRequest,
): Promise<ApiBinaryResult> {
  if (!Number.isSafeInteger(req.maxBytes) || req.maxBytes < 1)
    throw new TypeError("Limite de download inválido.");
  const res = await apiResponse(path, req, {
    accept: req.expectedContentType,
    privateBinary: true,
  });
  const type = res.headers.get("Content-Type")?.split(";")[0].trim();
  const declared = res.headers.get("Content-Length");
  if (
    type !== req.expectedContentType ||
    (declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > req.maxBytes))
  ) {
    await res.body?.cancel();
    throw new Error("Tipo ou tamanho do arquivo inválido.");
  }
  if (!res.body) throw new Error("Download sem conteúdo.");
  const reader = res.body.getReader(),
    chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      req.signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > req.maxBytes)
        throw new Error("Arquivo excede o limite de download.");
      chunks.push(new Uint8Array(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw networkError(error);
  } finally {
    reader.releaseLock();
  }
  req.signal?.throwIfAborted();
  if (declared !== null && size !== Number(declared))
    throw new Error("Download incompleto.");
  return {
    blob: new Blob(chunks, { type }),
    headers: Object.fromEntries(
      (req.responseHeaders ?? []).map((name) => [
        name.toLowerCase(),
        res.headers.get(name) ?? "",
      ]),
    ),
  };
}
