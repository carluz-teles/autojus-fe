"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { actionItemsKeys } from "@/features/action-items/hooks/use-action-items";
import {
  getActionItem,
  iniciarActionItem,
} from "@/features/action-items/services/action-items.service";
import { useApi } from "@/lib/api/use-api";

import { useActionItemReview } from "../../hooks/use-action-item-review";
import { generationBlockReason } from "../../lib/generation-eligibility";
import {
  clearInstructions,
  peekInstructions,
  setInstructions,
} from "../../lib/instructions-storage";
import { preconditionFromError } from "../../lib/peca-precondition";
import { createDraft } from "../../services/pecas-v2.service";
import { ActionItemReview } from "./action-item-review";

class EntryBlockedError extends Error {}

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
  const review = useActionItemReview(actionItemId, true);
  const work = review.detail;
  const started = useRef(false);
  // A intimação é o lar do trabalho: o "voltar" da construção aponta pra ela
  // (não mais pra uma tela de providência). retorno explícito tem prioridade.
  const origin =
    intimationId || work.data?.intimation_id
      ? `/intimacoes/${intimationId || work.data?.intimation_id}`
      : "/triagem";
  const back = params.get("retorno") || origin;
  const blockReason =
    actionItemId && work.data
      ? generationBlockReason(work.data, intimationId)
      : null;
  const create = useMutation({
    mutationFn: async () => {
      let draftId: string;
      if (!actionItemId) {
        if (!intimationId)
          throw new EntryBlockedError("Selecione a intimação de origem.");
        const existingItem = existingActionItemId
          ? await getActionItem(api, existingActionItemId)
          : null;
        if (existingItem && existingItem.intimation_id !== intimationId)
          throw new EntryBlockedError(
            "A providência não pertence a esta intimação.",
          );
        if (
          existingItem &&
          !existingItem.draft_id &&
          existingItem.origin_review_required
        )
          throw new EntryBlockedError(
            "Revise a origem da providência na intimação antes de gerar a peça.",
          );
        if (existingItem && !existingItem.draft_id && existingItem.gera_peca)
          throw new EntryBlockedError(
            "Esta providência gera peça. Abra a intimação para confirmar o tipo e continuar.",
          );
        // Um item sem gera_peca pode ter draft antigo. Reabra-o se existir;
        // caso contrário, crie pela intimação sem alterar o perfil do item.
        draftId = existingItem?.draft_id
          ? existingItem.draft_id
          : (await createDraft(api, { intimationId })).id;
      } else {
        const item = await getActionItem(api, actionItemId);
        qc.setQueryData(actionItemsKeys.detail(actionItemId), item);
        const blocked = generationBlockReason(item, intimationId);
        if (blocked) throw new EntryBlockedError(blocked);
        if (item.draft_id) {
          draftId = item.draft_id;
        } else {
          if (item.tipo_status !== "confiavel") {
            started.current = false;
            throw new Error("Confirme o tipo de trabalho para continuar.");
          }
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
    if (
      !started.current &&
      ((!actionItemId && intimationId) ||
        (work.data &&
          !work.isFetching &&
          !work.isError &&
          !blockReason &&
          (work.data.draft_id || work.data.tipo_status === "confiavel")))
    ) {
      started.current = true;
      mutate();
    }
  }, [
    work.data,
    work.isFetching,
    work.isError,
    blockReason,
    actionItemId,
    intimationId,
    mutate,
  ]);
  async function confirmAndContinue() {
    if (started.current || review.confirm.isPending) return;
    started.current = true;
    try {
      const item = await review.confirmOnce();
      if (item?.tipo_status !== "confiavel") {
        started.current = false;
        return;
      }
      mutate();
    } catch {
      started.current = false;
    }
  }
  return (
    <PageFrame
      header={<ShellBackLink href={back} label="Voltar à intimação" />}
    >
      <div className="flex flex-col items-start gap-4 p-6">
        {work.isFetching ? (
          <p role="status">Verificando a providência…</p>
        ) : blockReason ? (
          <>
            <p role="alert">{blockReason}</p>
            <Button onClick={() => router.push(back)}>
              Voltar à intimação
            </Button>
          </>
        ) : actionItemId &&
          work.data?.tipo_status === "a_confirmar" &&
          !work.data.draft_id ? (
          <ActionItemReview
            item={work.data}
            pending={review.confirm.isPending}
            error={review.confirm.isError}
            onConfirm={() => void confirmAndContinue()}
            onCancel={() => router.push(back)}
          />
        ) : work.isError || create.isError ? (
          <>
            <p role="alert">
              {preconditionFromError(create.error)
                ? `${preconditionFromError(create.error)!.title} ${preconditionFromError(create.error)!.description}`
                : create.error?.message ||
                  "Não foi possível carregar o trabalho."}
            </p>
            {create.error instanceof EntryBlockedError ? (
              <Button onClick={() => router.push(back)}>
                Voltar à intimação
              </Button>
            ) : (
              <Button
                onClick={() =>
                  work.isError ? work.refetch() : create.mutate()
                }
                disabled={create.isPending}
              >
                {preconditionFromError(create.error)
                  ? preconditionFromError(create.error)!.cta
                  : "Tentar novamente"}
              </Button>
            )}
          </>
        ) : (
          <p role="status">Abrindo a peça…</p>
        )}
      </div>
    </PageFrame>
  );
}
