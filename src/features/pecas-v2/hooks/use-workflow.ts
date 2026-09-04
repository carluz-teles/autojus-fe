// Autosave do editor rico da peça (content_html). O fluxo de assinatura/protocolo
// (e-SAJ) é uma vertical separada, ainda a construir — os hooks daquele fluxo foram
// removidos daqui até ela existir de verdade.

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import * as svc from "../services/pecas-v2.service";

/** Autosave do editor rico (Fase B) — grava HTML do Tiptap. Não invalida
 *  o cache (autosave é frequente; o cache mais recente já é o do próprio
 *  editor). O refetch acontece só quando o usuário sai da tela. Também é
 *  usado pelo "Salvar" da barra (flush explícito do HTML atual). */
export function useSaveContentHtml(id: string) {
  const fetcher = useApi();
  return useMutation({
    mutationFn: (html: string) => svc.saveContentHtml(fetcher, id, html),
  });
}
