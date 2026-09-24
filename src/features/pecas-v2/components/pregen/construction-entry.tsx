"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { useActionItemDetalhe } from "@/features/action-items/hooks/use-action-items";
import {
  getActionItem,
  iniciarActionItem,
} from "@/features/action-items/services/action-items.service";
import { useApi } from "@/lib/api/use-api";

import {
  clearInstructions,
  peekInstructions,
  setInstructions,
} from "../../lib/instructions-storage";
import { preconditionFromError } from "../../lib/peca-precondition";
import { createDraft } from "../../services/pecas-v2.service";

// NAVEGAR-PRIMEIRO: a ConstructionEntry só CRIA o rascunho e navega direto pra
// /pecas/:id?auto=1 — a sequência de auto-partida (teses → conferência → generate)
// roda LÁ, dirigindo o loader de 4 fases desde o início. Antes, o ciclo inteiro
// rodava aqui ("Construindo a peça…") e só depois navegava, criando DUAS telas de
// loading. Agora esta tela é uma transição curtíssima (só o createDraft).
//
// O prompt opcional (GerarPecaModal, gravado por actionItemId ou intimationId)
// é re-chaveado por draftId antes de navegar. A tela da peça lê por draftId,
// inclusive após refresh; só limpa o prompt quando a peça fica pronta.
export function ConstructionEntry({
  actionItemId = "",
  existingActionItemId = "",
  intimationId = "",
  auto = false,
}: {
  actionItemId?: string;
  existingActionItemId?: string;
  intimationId?: string;
  auto?: boolean;
}) {
  const api = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const work = useActionItemDetalhe(actionItemId);
  const started = useRef(false);
  // A intimação é o lar do trabalho: o "voltar" da construção aponta pra ela
  // (não mais pra uma tela de providência). retorno explícito tem prioridade.
  const origin = intimationId ? `/intimacoes/${intimationId}` : "/triagem";
  const back = params.get("retorno") || origin;
  const create = useMutation({
    mutationFn: async () => {
      let draftId: string;
      if (!actionItemId) {
        if (!intimationId) throw new Error("Selecione a intimação de origem.");
        const existingItem = existingActionItemId
          ? await getActionItem(api, existingActionItemId)
          : null;
        if (existingItem && existingItem.intimation_id !== intimationId)
          throw new Error("A providência não pertence a esta intimação.");
        // Um item sem gera_peca pode ter draft antigo. Reabra-o se existir;
        // caso contrário, crie pela intimação sem alterar o perfil do item.
        draftId = existingItem?.draft_id
          ? existingItem.draft_id
          : (await createDraft(api, { intimationId })).id;
      } else {
        const item = work.data;
        if (!item) throw new Error("Não foi possível iniciar a peça.");
        if (!item.intimation_id)
          throw new Error(
            "A construção de uma peça deve começar por uma intimação. Abra a intimação de origem para continuar.",
          );
        if (item.draft_id) {
          draftId = item.draft_id;
        } else {
          if (!item.gera_peca || item.tipo_status !== "confiavel")
            throw new Error("Revise o tipo antes de gerar a peça.");
          if (["DONE", "CANCELLED", "DISMISSED"].includes(item.status))
            throw new Error("Este item já foi encerrado.");
          // Atalho "Gerar peça": clicar aqui É concordar com a providência. Se ela
          // ainda está SUGGESTED, iniciamos (SUGGESTED → TODO) antes de abrir a
          // construção — sem um passo de curadoria separado. TODO/WORKING seguem direto.
          if (item.status === "SUGGESTED") {
            await iniciarActionItem(api, actionItemId);
          }
          draftId = (
            await createDraft(api, {
              actionItemId,
              intimationId: item.intimation_id,
              title: item.title,
              instructions: `${item.title}\n\n${item.description || "Identificar dados pendentes para revisão do advogado."}`,
            })
          ).id;
        }
      }
      // Re-chaveia o prompt opcional (modal) de actionItemId → draftId, pra a tela
      // da peça lê-lo sem depender da URL. Só quando há prompt e é fluxo auto.
      if (auto) {
        const storageKey = actionItemId || intimationId;
        const instr = peekInstructions(storageKey);
        if (instr) {
          setInstructions(draftId, instr);
          clearInstructions(storageKey);
        }
      }
      return draftId;
    },
    onSuccess: async (draftId) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["action-items"] }),
        // O atalho confirmou a providência (SUGGESTED → TODO): invalida a Triagem
        // para o card refletir o novo status ao voltar.
        qc.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
      // auto=1 sinaliza pra tela da peça disparar a auto-partida (teses →
      // conferência → generate) e mostrar o loader de 4 fases direto.
      const q = auto ? "auto=1&" : "";
      router.replace(
        `/pecas/${draftId}?${q}retorno=${encodeURIComponent(back)}`,
      );
    },
  });
  const { mutate } = create;
  useEffect(() => {
    if ((work.data || (!actionItemId && intimationId)) && !started.current) {
      started.current = true;
      mutate();
    }
  }, [work.data, actionItemId, intimationId, mutate]);
  return (
    <PageFrame
      header={<ShellBackLink href={origin} label="Voltar à intimação" />}
    >
      <div className="flex flex-col items-start gap-4 p-6">
        {work.isError || create.isError ? (
          <>
            <p role="alert">
              {preconditionFromError(create.error)
                ? `${preconditionFromError(create.error)!.title} ${preconditionFromError(create.error)!.description}`
                : create.error?.message ||
                  "Não foi possível carregar o trabalho."}
            </p>
            <Button
              onClick={() => (work.isError ? work.refetch() : create.mutate())}
              disabled={create.isPending}
            >
              {preconditionFromError(create.error)
                ? preconditionFromError(create.error)!.cta
                : "Tentar novamente"}
            </Button>
          </>
        ) : (
          <p role="status">Abrindo a peça…</p>
        )}
      </div>
    </PageFrame>
  );
}
