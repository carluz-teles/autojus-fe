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
  type ApiBinaryRequest,
  type ApiBinaryResult,
  apiFetch,
  apiFetchBinary,
  apiFetchBlob,
  type ApiRequest,
} from "./client";

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
      req: Omit<ApiRequest, "getToken"> | Omit<ApiBinaryRequest, "getToken">,
      mode: "json" | "blob" | "binary",
    ): Promise<T> => {
      const generation = transition.generation;
      const organizationId = orgId ?? null;
      const personal =
        path === "/v1/backoffice/session" ||
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
        const fetcher =
          mode === "binary"
            ? (path: string, req: ApiRequest) =>
                apiFetchBinary(path, req as ApiBinaryRequest)
            : mode === "blob"
              ? apiFetchBlob
              : apiFetch;
        const response = await fetcher(path, {
          ...req,
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
        });
        if (controller.signal.aborted)
          throw new DOMException("Request cancelled", "AbortError");
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

export function useApiBinary() {
  const request = useBoundRequest();
  return useCallback(
    (path: string, req: Omit<ApiBinaryRequest, "getToken">) =>
      request<ApiBinaryResult>(path, req, "binary"),
    [request],
  );
}
export type ApiBinaryFetcher = ReturnType<typeof useApiBinary>;
