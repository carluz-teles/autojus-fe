"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";
import type { IterateScope, QuickAdjustKind } from "../types";

/** Iteração livre (usuário escreve instrução). Devolve IterationResult com
 *  changes já hidratadas pelo BE (SectionChange[] direto — nenhum parseamento
 *  no cliente). O pai (ConstrucaoPage) monta o PreviewState em cima disso. */
export function useIterate(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (args: { scope: IterateScope; instruction: string }) =>
      svc.iterateDraft(fetcher, id, args.scope, args.instruction),
  });
}

/** Um dos 4 ajustes rápidos (chip). Mesmo endpoint (/iterate) com kind. */
export function useQuickAdjust(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (args: { scope: IterateScope; kind: QuickAdjustKind }) =>
      svc.applyQuickAdjust(fetcher, id, args.scope, args.kind),
  });
}

/** "Refazer seção" — segundo o plano, só foca o painel. Hook pronto pra caso
 *  algum dia queiramos disparar de fato. */
export function useRefazerSection(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (sectionId: string) => svc.refazerSection(fetcher, id, sectionId),
  });
}
