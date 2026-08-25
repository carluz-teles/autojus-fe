"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";

/** Dispara a análise da peça. Reusa /iterate com scope=whole e uma instruction
 *  padrão de revisão — o BE devolve SectionChange[] já com categoria e
 *  explicação (CLAREZA/FUNDAMENTAÇÃO/COMPLETUDE/COERÊNCIA). */
export function useRunReview(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: () => svc.runReview(fetcher, id),
  });
}
