"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { useActionItemDetalhe } from "@/features/action-items/hooks/use-action-items";
import { iniciarActionItem } from "@/features/action-items/services/action-items.service";
import { INSTRUCTIONS_SESSION_KEY } from "@/features/prazos/components/intimacao-detalhe/disposicao-section";
import { type ApiFetcher, useApi } from "@/lib/api/use-api";

import {
  createDraft,
  generateDraft,
  generateIntimationTheses,
  getDraft,
  getIntimationTheses,
} from "../../services/pecas-v2.service";

// Auto-partida: dispara a geração da peça direto — auto-seleciona TODAS as teses
// da intimação e chama /generate, pulando a tela de escolha de teses. Espelha o
// `create` da usePartida (idempotente): reabrir peça existente nunca substitui
// conteúdo. Só age numa peça recém-criada (CREATED, sem conteúdo).
//
// `instructions` vem do modal de orientação opcional (GerarPecaModal), transportado
// via sessionStorage para evitar colocar 2000 chars na URL/history.
async function autoPartida(
  api: ApiFetcher,
  draftId: string,
  intimationId: string,
  instructions?: string,
): Promise<void> {
  const draft = await getDraft(api, draftId);
  if (draft.sagaState !== "CREATED" || draft.contentHtml) return;
  let theses = await getIntimationTheses(api, intimationId);
  if (theses.length === 0)
    theses = await generateIntimationTheses(api, intimationId);
  await generateDraft(
    api,
    draftId,
    theses.map((t) => t.id),
    instructions || undefined,
  );
}

/** Lê e limpa as instructions do sessionStorage (curta duração, chave por actionItemId). */
function consumeInstructions(actionItemId: string): string {
  if (!actionItemId || typeof sessionStorage === "undefined") return "";
  const key = `${INSTRUCTIONS_SESSION_KEY}${actionItemId}`;
  try {
    const value = sessionStorage.getItem(key) ?? "";
    if (value) sessionStorage.removeItem(key);
    return value;
  } catch {
    return "";
  }
}

// Both origins resume the same draft; empty drafts open its preparation canvas.
// `auto` = auto-partida (construção direto, com tela de "Construindo a peça…").
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
      let origem = intimationId;
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
        origem = item.intimation_id;
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
      // Lê as instructions do sessionStorage (colocadas pelo GerarPecaModal).
      // Chamada aqui (dentro do mutationFn, no client) pra garantir que está
      // no browser.
      const instructions = consumeInstructions(actionItemId || intimationId);

      // Auto-partida: dispara a geração direto. Uma falha aqui degrada para a tela
      // de preparação (o draft já existe) — não trava o usuário.
      if (auto && origem) {
        try {
          await autoPartida(api, draftId, origem, instructions || undefined);
        } catch {
          // segue para /pecas/:id na tela de preparação (pregen).
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
      router.replace(`/pecas/${draftId}?retorno=${encodeURIComponent(back)}`);
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
          <p role="status">
            {auto ? "Construindo a peça…" : "Abrindo a peça…"}
          </p>
        )}
      </div>
    </PageFrame>
  );
}
