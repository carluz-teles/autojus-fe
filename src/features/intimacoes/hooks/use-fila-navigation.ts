"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";

import { detalheNaFila, retornoDaFila } from "../lib/fila-navigation";

const subscribe = () => () => {};
const serverSnapshot = () => "[]";

/** Keeps only navigation IDs in this tab; all entity data stays in React Query. */
export function useFilaNavigation(currentId?: string) {
  const { userId, orgId } = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  const retorno = currentId
    ? retornoDaFila(params.get("retorno"))
    : retornoDaFila(`${pathname}${params.size ? `?${params}` : ""}`);
  const key = `intimacoes:fila:${userId}:${orgId}:${retorno}`;
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(key) ?? "[]";
      } catch {
        return "[]";
      }
    },
    serverSnapshot,
  );
  const ids = useMemo<string[]>(() => {
    try {
      const value: unknown = JSON.parse(stored);
      return Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }, [stored]);
  const index = currentId ? ids.indexOf(currentId) : -1;
  return {
    retorno,
    label: retorno.startsWith("/triagem")
      ? "Voltar à triagem"
      : retorno.startsWith("/processos/")
        ? "Voltar ao processo"
        : "Voltar às intimações",
    anterior: index > 0 ? detalheNaFila(ids[index - 1], retorno) : null,
    proxima:
      index >= 0 && index < ids.length - 1
        ? detalheNaFila(ids[index + 1], retorno)
        : null,
    href: (id: string) => detalheNaFila(id, retorno),
    lembrar: (items: { id: string }[]) => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify(items.map((item) => item.id)),
        );
      } catch {
        /* Navigation remains available without storage. */
      }
    },
  };
}

export { useUrlFilters as useFiltrosDaFila } from "@/lib/hooks/use-url-filters";
