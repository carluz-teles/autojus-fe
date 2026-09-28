"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPrazoTipos } from "../../services/prazos.service";

export function usePrazoTipos(intimacaoId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["prazos", "tipos", intimacaoId],
    queryFn: () => getPrazoTipos(api, intimacaoId),
    enabled: !!intimacaoId,
  });
}
