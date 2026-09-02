import { apiErrorFromResponse, networkError } from "./errors";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Obtém o JWT do Clerk. No cliente: useAuth().getToken; no server: auth().getToken. */
export type TokenGetter = () => Promise<string | null | undefined>;

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serializado como JSON no corpo (não usar com FormData). */
  body?: unknown;
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
export async function apiFetch<T>(
  path: string,
  req: ApiRequest = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    query,
    signal,
    headers,
    getToken,
  } = req;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  // Para JSON body: define Content-Type. Para FormData: NÃO definir — o browser
  // inclui o boundary automaticamente. São mutuamente exclusivos.
  if (body !== undefined && formData === undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (getToken) {
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (formData !== undefined) {
    fetchBody = formData;
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
    });
  } catch (cause) {
    throw networkError(cause);
  }

  if (!res.ok) throw await apiErrorFromResponse(res);

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
  const { query, signal, headers, getToken } = req;

  const finalHeaders: Record<string, string> = { ...headers };
  if (getToken) {
    const token = await getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method: "GET",
      headers: finalHeaders,
      signal,
    });
  } catch (cause) {
    throw networkError(cause);
  }

  if (!res.ok) throw await apiErrorFromResponse(res);
  return res.blob();
}
