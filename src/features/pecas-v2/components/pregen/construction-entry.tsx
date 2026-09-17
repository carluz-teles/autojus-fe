"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { useActionItemDetalhe } from "@/features/action-items/hooks/use-action-items";
import { iniciarActionItem } from "@/features/action-items/services/action-items.service";
import { useApi } from "@/lib/api/use-api";

import {
  clearInstructions,
  peekInstructions,
  setInstructions,
} from "../../lib/instructions-storage";
import { createDraft } from "../../services/pecas-v2.service";

// NAVEGAR-PRIMEIRO: a ConstructionEntry só CRIA o rascunho e navega direto pra
// /pecas/:id?auto=1 — a sequência de auto-partida (teses → conferência → generate)
// roda LÁ, dirigindo o loader de 4 fases desde o início. Antes, o ciclo inteiro
// rodava aqui ("Construindo a peça…") e só depois navegava, criando DUAS telas de
// loading. Agora esta tela é uma transição curtíssima (só o createDraft).
//
// O prompt opcional (GerarPecaModal, gravado por actionItemId) é re-chaveado por
// draftId antes de navegar — a tela da peça (use-construction) lê por draftId,
// sem carregar o actionItemId na URL. BLOCKER-3: a limpeza do prompt só ocorre
// após o generate 202 (na tela da peça), então sobrevive a retry.
export function ConstructionEntry({
  actionItemId = "",
  intimationId = "",
  auto = false,
}: {
  actionItemId?: string;
  intimationId?: string;
  auto?: boolean;
}) {
  const api = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const work = useActionItemDetalhe(actionItemId);
  const started = useRef(false);
  const origin = actionItemId
    ? `/providencias/${actionItemId}`
    : `/intimacoes/${intimationId}`;
  const back = params.get("retorno") || origin;
  const create = useMutation({
    mutationFn: async () => {
      let draftId: string;
      if (!actionItemId) {
        if (!intimationId) throw new Error("Selecione a intimação de origem.");
        draftId = (await createDraft(api, { intimationId })).id;
      } else {
        const item = work.data;
        if (!item) throw new Error("Providência não encontrada.");
        if (!item.intimation_id)
          throw new Error(
            "A construção de uma peça deve começar por uma intimação. Abra a intimação de origem para continuar.",
          );
        if (item.draft_id) {
          draftId = item.draft_id;
        } else {
          if (!item.gera_peca || item.tipo_status !== "confiavel")
            throw new Error(
              "Revise o tipo da providência antes de gerar a peça.",
            );
          if (["DONE", "CANCELLED", "DISMISSED"].includes(item.status))
            throw new Error("Esta providência já foi encerrada.");
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
      header={
        <ShellBackLink
          href={origin}
          label={actionItemId ? "Voltar à providência" : "Voltar à intimação"}
        />
      }
    >
      <div className="flex flex-col items-start gap-4 p-6">
        {work.isError || create.isError ? (
          <>
            <p role="alert">
              {create.error?.message ||
                "Não foi possível carregar a providência."}
            </p>
            <Button
              onClick={() => (work.isError ? work.refetch() : create.mutate())}
              disabled={create.isPending}
            >
              Tentar novamente
            </Button>
          </>
        ) : (
          <p role="status">Abrindo a peça…</p>
        )}
      </div>
    </PageFrame>
  );
}
