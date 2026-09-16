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

import { runAssessmentAndGenerate } from "../../lib/assessment-lifecycle";
import {
  buildAssessmentInput,
  createDraft,
  generateTheses,
  getDraft,
  getTheses,
} from "../../services/pecas-v2.service";

// Auto-partida: dispara a geração da peça direto — auto-seleciona TODAS as teses
// do RASCUNHO e roda o ciclo OBRIGATÓRIO da conferência (assessment request →
// poll → auto-validate → generate), pulando a tela de escolha de teses e a tela
// de revisão de fontes. Espelha o `create` da usePartida (idempotente): reabrir
// peça existente nunca substitui conteúdo. Só age numa peça recém-criada
// (CREATED, sem conteúdo).
//
// IMPORTANTE (fix do 404): as teses DEVEM ser draft-scoped (getTheses/
// generateTheses → /v1/pecas/:id/theses). A conferência draft-scoped carrega o
// Basis via ListSuggestedThesesByDraft(draftId); ids intimation-scoped (draft_id
// NULL) não existem nessa lista → ErrSuggestedThesisNotFound → 404. Usar as teses
// do próprio rascunho (as mesmas do pregen/gerarMinuta) faz os ids baterem.
//
// `instructions` vem do modal de orientação opcional (GerarPecaModal), transportado
// via sessionStorage para evitar colocar 2000 chars na URL/history.
//
// O auto-validate é silencioso (sem card de revisão de fontes) — a garantia se
// mantém via validated_by = usuário atual, conforme o design aprovado.
async function autoPartida(
  api: ApiFetcher,
  draftId: string,
  instructions?: string,
): Promise<void> {
  const draft = await getDraft(api, draftId);
  if (draft.sagaState !== "CREATED" || draft.contentHtml) return;
  // Teses DRAFT-scoped — precisam existir no Basis draft-scoped da conferência.
  let theses = await getTheses(api, draftId);
  if (theses.length === 0) theses = await generateTheses(api, draftId);
  // Input canônico — a MESMA instância vai para request/validate/generate.
  const input = buildAssessmentInput(
    theses.map((t) => t.id),
    instructions ?? "",
  );
  await runAssessmentAndGenerate(api, draftId, input, {
    expectedCurrentVersionId: draft.currentVersionId,
  });
}

/** Lê as instructions do sessionStorage SEM apagar (BLOCKER-3: sobrevivem para
 *  retry se assessment/generate falhar). A limpeza só ocorre após generate 202. */
function peekInstructions(actionItemId: string): string {
  if (!actionItemId || typeof sessionStorage === "undefined") return "";
  try {
    return (
      sessionStorage.getItem(`${INSTRUCTIONS_SESSION_KEY}${actionItemId}`) ?? ""
    );
  } catch {
    return "";
  }
}

/** Remove as instructions do sessionStorage (após generate bem-sucedido). */
function clearInstructions(actionItemId: string): void {
  if (!actionItemId || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(`${INSTRUCTIONS_SESSION_KEY}${actionItemId}`);
  } catch {
    // no-op
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
      // Lê (SEM apagar) as instructions do sessionStorage (colocadas pelo
      // GerarPecaModal). BLOCKER-3: só apaga após o generate 202 — se o ciclo da
      // conferência ou o generate falhar, as instructions sobrevivem para retry.
      const storageKey = actionItemId || intimationId;
      const instructions = peekInstructions(storageKey);

      // Auto-partida: roda o ciclo conferência → generate. Uma falha aqui degrada
      // para a tela de preparação (o draft já existe) — não trava o usuário, e as
      // instructions permanecem no sessionStorage para uma nova tentativa.
      // O guard `origem` garante que o rascunho tem intimação de origem (a
      // construção exige uma); as teses em si são resolvidas draft-scoped.
      if (auto && origem) {
        try {
          await autoPartida(api, draftId, instructions || undefined);
          // Sucesso (generate 202): agora sim limpa as instructions.
          clearInstructions(storageKey);
        } catch {
          // segue para /pecas/:id na tela de preparação (pregen); instructions
          // preservadas.
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
      // BLOCKER-2: preserva auto=1 para o guard isFreshAutoPregen (construction-page)
      // continuar mostrando o loader em vez da tela de pregen enquanto o saga avança.
      router.replace(
        `/pecas/${draftId}?auto=1&retorno=${encodeURIComponent(back)}`,
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
          <p role="status">
            {auto ? "Construindo a peça…" : "Abrindo a peça…"}
          </p>
        )}
      </div>
    </PageFrame>
  );
}
