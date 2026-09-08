"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { useActionItemDetalhe } from "@/features/action-items/hooks/use-action-items";
import { useApi } from "@/lib/api/use-api";

import { createDraft } from "../../services/pecas-v2.service";

// Both origins open the same construction, with no intermediate preparation form.
export function ConstructionEntry({
  actionItemId = "",
  intimationId = "",
}: {
  actionItemId?: string;
  intimationId?: string;
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
      if (!actionItemId) {
        if (!intimationId) throw new Error("Selecione a intimação de origem.");
        return (await createDraft(api, { intimationId })).id;
      }
      const item = work.data;
      if (!item) throw new Error("Providência não encontrada.");
      if (!item.intimation_id)
        throw new Error(
          "A construção de uma peça deve começar por uma intimação. Abra a intimação de origem para continuar.",
        );
      if (item.draft_id) return item.draft_id;
      if (
        !["TODO", "WORKING"].includes(item.status) ||
        !item.gera_peca ||
        item.tipo_status !== "confiavel"
      )
        throw new Error(
          "Revise e adicione a providência antes de gerar a peça.",
        );
      const result = await createDraft(api, {
        actionItemId,
        intimationId: item.intimation_id,
        title: item.title,
        instructions: `${item.title}\n\n${item.description || "Identificar dados pendentes para revisão do advogado."}`,
      });
      return result.id;
    },
    onSuccess: async (draftId) => {
      await qc.invalidateQueries({ queryKey: ["action-items"] });
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
          <p role="status">Abrindo a construção da peça…</p>
        )}
      </div>
    </PageFrame>
  );
}
