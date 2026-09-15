"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { cnjDigits, maskCnj } from "../lib/cnj";
import { createImport, getImport } from "../services/acquisition.service";
import type { CreateImportInput } from "../types";

// Chaves de query centralizadas (padrão das outras features).
export const acquisitionKeys = {
  all: ["acquisition", "imports"] as const,
  detail: (id: string) => [...acquisitionKeys.all, id] as const,
};

/** Estados da máquina do sheet de importação (ver contrato + protótipo). */
export type ImportPhase =
  | "input"
  | "running"
  | "ok"
  | "already"
  | "invalid"
  | "failed"
  | "limit"
  | "unavailable"
  | "error";

/** Mutation de criar importação — POST /v1/acquisition/imports. */
function useCreateImport() {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (body: CreateImportInput) => createImport(fetcher, body),
  });
}

/**
 * Polling do capture_run — GET /v1/acquisition/imports/:id. Auto-desliga (regra do
 * ERD): o `refetchInterval` retorna `false` assim que o status vira terminal
 * (OK|PARTIAL|FAILED); só refaz a busca enquanto RUNNING.
 */
function useImportRun(importId: string | null) {
  const fetcher = useApi();
  return useQuery({
    queryKey: acquisitionKeys.detail(importId ?? ""),
    queryFn: () => getImport(fetcher, importId as string),
    enabled: !!importId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && status !== "RUNNING" ? false : 2500;
    },
  });
}

function errorPhase(error: unknown): ImportPhase {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.kind === "VALIDATION") return "invalid";
    if (error.status === 403 || error.kind === "FORBIDDEN") return "limit";
    if (error.status === 503) return "unavailable";
  }
  return "error";
}

/**
 * Hook público do sheet "Importar por CNJ": compõe a mutation de criação com o
 * polling do capture_run e deriva a fase da máquina de estados. O componente só
 * faz binding — nenhuma lógica de fase vive nele.
 */
export function useImportByCnj() {
  const create = useCreateImport();
  const [cnj, setCnjRaw] = useState("");

  const result = create.data;
  const importId =
    result && !result.already_imported ? (result.import_id ?? null) : null;
  const run = useImportRun(importId);

  const phase: ImportPhase = (() => {
    if (create.isPending) return "running";
    if (create.isError) return errorPhase(create.error);
    if (!result) return "input";
    if (result.already_imported) return "already";
    if (run.isError) return "error";
    const status = run.data?.status ?? result.status;
    if (status === "OK" || status === "PARTIAL") return "ok";
    if (status === "FAILED") return "failed";
    return "running";
  })();

  function setCnj(value: string) {
    // Editar o número depois de um resultado/erro volta a máquina para "input".
    if (create.isError || create.data) create.reset();
    setCnjRaw(maskCnj(value));
  }

  function submit() {
    const digits = cnjDigits(cnj);
    create.reset();
    create.mutate({ cnj: digits || cnj });
  }

  return {
    cnj,
    setCnj,
    submit,
    phase,
    courtRecordId: result?.court_record_id ?? null,
  };
}
