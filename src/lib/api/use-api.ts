"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

import { apiFetch, type ApiRequest } from "./client";

/**
 * Liga o `getToken` do Clerk ao `apiFetch`. É a ponte entre auth e a camada de
 * rede: services/hooks pedem o fetcher aqui e nunca lidam com o token na mão.
 */
export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    <T>(path: string, req: Omit<ApiRequest, "getToken"> = {}) =>
      apiFetch<T>(path, { ...req, getToken }),
    [getToken],
  );
}

export type ApiFetcher = ReturnType<typeof useApi>;
