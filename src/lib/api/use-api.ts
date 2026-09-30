"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useSyncExternalStore } from "react";

import {
  isCurrentOrganizationRequest,
  registerOrganizationRequest,
  subscribeTransition,
  transitionSnapshot,
} from "@/lib/auth/organization-transition";

import {
  apiFetch,
  apiFetchBlob,
  apiGetPresignedBlob,
  apiPutPresigned,
  type ApiRequest,
} from "./client";

type BoundRequest = Omit<ApiRequest, "getToken"> & { rawBody?: Blob };
type RequestMode = "json" | "blob" | "storage-put" | "storage-blob";

function useBoundRequest() {
  const { getToken, orgId } = useAuth();
  const transition = useSyncExternalStore(
    subscribeTransition,
    transitionSnapshot,
    transitionSnapshot,
  );
  return useCallback(
    async <T>(
      path: string,
      req: BoundRequest,
      mode: RequestMode,
    ): Promise<T> => {
      const generation = transition.generation;
      const organizationId = orgId ?? null;
      const personal =
        path === "/v1/identity/profile/complete" ||
        path.startsWith("/v1/lookup/") ||
        (path === "/v1/identity/me" && !organizationId);
      if (
        !personal &&
        !isCurrentOrganizationRequest(generation, organizationId)
      )
        throw new DOMException("Organization changed", "AbortError");
      const controller = new AbortController();
      const unregister = registerOrganizationRequest(controller);
      const abort = () => controller.abort();
      if (req.signal?.aborted) controller.abort();
      req.signal?.addEventListener("abort", abort, { once: true });
      try {
        const { rawBody: _rawBody, ...apiReq } = req;
        let response: T;
        if (mode === "storage-put") {
          if (!req.rawBody) throw new Error("Arquivo ausente para upload.");
          await apiPutPresigned(path, req.rawBody, controller.signal);
          response = undefined as T;
        } else if (mode === "storage-blob") {
          response = (await apiGetPresignedBlob(path, controller.signal)) as T;
        } else {
          const fetcher = mode === "blob" ? apiFetchBlob : apiFetch;
          response = (await fetcher(path, {
            ...apiReq,
            signal: controller.signal,
            getToken: async () => {
              if (
                !personal &&
                !isCurrentOrganizationRequest(generation, organizationId)
              )
                throw new DOMException("Organization changed", "AbortError");
              const token = await getToken(
                organizationId ? { organizationId } : undefined,
              );
              if (
                !personal &&
                !isCurrentOrganizationRequest(generation, organizationId)
              )
                throw new DOMException("Organization changed", "AbortError");
              if (!token) throw new Error("Sessão sem token de autenticação.");
              return token;
            },
          })) as T;
        }
        if (controller.signal.aborted)
          throw new DOMException("Request aborted", "AbortError");
        if (
          !personal &&
          !isCurrentOrganizationRequest(generation, organizationId)
        )
          throw new DOMException("Organization changed", "AbortError");
        return response as T;
      } finally {
        req.signal?.removeEventListener("abort", abort);
        unregister();
      }
    },
    [getToken, orgId, transition.generation],
  );
}

/**
 * Liga o `getToken` do Clerk ao `apiFetch`. É a ponte entre auth e a camada de
 * rede: services/hooks pedem o fetcher aqui e nunca lidam com o token na mão.
 */
export function useApi() {
  const request = useBoundRequest();
  return useCallback(
    <T>(path: string, req: Omit<ApiRequest, "getToken"> = {}) =>
      request<T>(path, req, "json"),
    [request],
  );
}

export type ApiFetcher = ReturnType<typeof useApi>;

/**
 * Mesma ponte, para respostas BINÁRIAS (bytes de PDF). Devolve um Blob — o
 * caller vira object URL para embutir num viewer sem expor o token na URL.
 */
export function useApiBlob() {
  const request = useBoundRequest();

  return useCallback(
    (path: string, req: Omit<ApiRequest, "getToken"> = {}) =>
      request<Blob>(path, req, "blob"),
    [request],
  );
}

/** Storage signed URLs never receive Clerk tokens; requests remain org-bound. */
export function usePresignedStorage() {
  const request = useBoundRequest();
  return {
    put: (url: string, file: Blob, signal?: AbortSignal) =>
      request<void>(url, { rawBody: file, signal }, "storage-put"),
    getBlob: (url: string, signal?: AbortSignal) =>
      request<Blob>(url, { signal }, "storage-blob"),
  };
}

export type PresignedStorage = ReturnType<typeof usePresignedStorage>;
