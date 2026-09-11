"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { ActionItemView } from "@/features/action-items/types";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";
import { rotuloTipoAuto } from "@/features/documentos/lib/tipo-autos";
import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";
import { useIntimacaoDetalhe } from "@/features/prazos/hooks/use-intimacao-detalhe";
import { usePartes } from "@/features/processos/hooks/use-processos";
import type { PageEnvelope } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";

import type { PecaContexto } from "../lib/peca-contexto";
import { partyOptions, representedParty } from "../lib/piece-intent";
import {
  createDraft,
  generateDraft,
  generateIntimationTheses,
  getDraft,
  getIntimationTheses,
} from "../services/pecas-v2.service";
import type { Thesis } from "../types";
import { useThesesStream } from "./use-theses-stream";

export interface Preparation {
  objective: string;
  client: string;
  role: string;
  facts: string;
  missing: string;
  pieceType: string;
  actionItemId: string;
}
export const emptyPreparation: Preparation = {
  objective: "",
  client: "",
  role: "",
  facts: "",
  missing: "",
  pieceType: "MOTION",
  actionItemId: "",
};
export function preparationInstructions(p: Preparation): string {
  return `OBJETIVO CONFIRMADO: ${p.objective.trim()}\nPARTE REPRESENTADA: ${p.client.trim()}\nPOLO: ${p.role}\nFATOS INFORMADOS PELO ADVOGADO: ${p.facts.trim() || "Nenhum fato adicional confirmado."}\nDADOS PENDENTES: ${p.missing.trim() || "Identificar no texto todo dado necessário não fornecido."}`;
}
export function usePartida(intimacaoId: string) {
  const fetcher = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const detalhe = useIntimacaoDetalhe(intimacaoId);
  const parties = usePartes(detalhe.model?.courtRecordId ?? "");
  const docs = useDocumentosDoProcesso(detalhe.model?.courtRecordId ?? "");
  const [overrides, setPreparation] = useState<Partial<Preparation>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const key = ["intimacao", intimacaoId, "theses"];
  const thesesQuery = useQuery({
    queryKey: key,
    queryFn: () => getIntimationTheses(fetcher, intimacaoId),
    staleTime: Infinity,
  });
  const actions = useQuery({
    queryKey: ["preparation-actions", detalhe.model?.courtRecordId],
    enabled: !!detalhe.model?.courtRecordId,
    queryFn: () =>
      fetcher<PageEnvelope<ActionItemView>>(
        `/v1/processos/${detalhe.model!.courtRecordId}/action-items`,
        { query: { limit: 100 } },
      ),
  });
  const providencias = (actions.data?.data ?? []).filter(
    (a) => a.intimation_id === intimacaoId && a.status !== "DONE",
  );
  const actionItemId =
    overrides.actionItemId ??
    params.get("providencia") ??
    (providencias.length === 1 ? providencias[0].id : "");
  const action = providencias.find((a) => a.id === actionItemId);
  const represented = representedParty(
    parties.data,
    detalhe.intimacao?.recipients,
  );
  const profileType = (
    {
      contestacao: "DEFENSE",
      peticao_inicial: "COMPLAINT",
      apelacao: "APPEAL",
      manifestacao: "MOTION",
    } as Record<string, string>
  )[action?.piece_profile_key ?? ""];
  const preparation: Preparation = {
    ...emptyPreparation,
    objective: action?.title ?? "",
    client: represented?.name ?? "",
    role: represented?.role ?? "",
    ...overrides,
    actionItemId,
    pieceType: profileType ?? overrides.pieceType ?? "MOTION",
  };
  const existing = useQuery({
    queryKey: ["preparation-existing", intimacaoId, actionItemId],
    enabled: !actions.isPending,
    queryFn: () =>
      fetcher<{
        data: { id: string; title: string; saga_state: string } | null;
      }>(`/v1/intimacoes/${intimacaoId}/peca`, {
        query: { action_item_id: actionItemId || undefined },
      }),
  });
  const generate = useMutation({
    mutationFn: () => generateIntimationTheses(fetcher, intimacaoId),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
      setSelected(new Set());
    },
    onError: () => toast.error("Não foi possível sugerir fundamentos."),
  });

  // ── Streaming SSE dos fundamentos (aparecem um a um) ───────────────────────
  // Liga no 1º acesso: a query GET já resolveu e não há tese persistida. Se o
  // stream cair antes da 1ª tese, `fellBack` desliga o stream e o consumer usa
  // o POST síncrono. Se cair no meio (≥1 tese), mantém os cards + erro inline.
  const [fellBack, setFellBack] = useState(false);
  const noPersisted =
    thesesQuery.isSuccess && (thesesQuery.data?.length ?? 0) === 0;
  const streamEnabled = noPersisted && !fellBack && !generate.isPending;

  const onStreamDone = useCallback(
    (authoritative: Thesis[]) => {
      // Reconciliação: os cards do stream usam ids locais (`stream-${n}`); a
      // lista autoritativa traz os ids reais persistidos. Remapeia a SELEÇÃO
      // por POSIÇÃO — a i-ésima tese selecionada vira o i-ésimo id real.
      qc.setQueryData(key, authoritative);
      setSelected((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<string>();
        authoritative.forEach((t, i) => {
          const localId = `stream-${i + 1}`;
          if (prev.has(localId) || prev.has(t.id)) next.add(t.id);
        });
        return next;
      });
    },
    // key é derivado de intimacaoId; qc é estável.
    [qc, intimacaoId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onStreamError = useCallback((hadThesis: boolean) => {
    // Falha pré-1ª-tese → degrada pro POST síncrono (desliga o stream). Falha
    // mid-stream → mantém os cards; o erro inline vem do próprio state do stream.
    if (!hadThesis) setFellBack(true);
  }, []);

  const stream = useThesesStream(intimacaoId, {
    enabled: streamEnabled,
    onDone: onStreamDone,
    onError: onStreamError,
  });

  // Degradação: quando o stream sinaliza falha pré-1ª-tese, dispara o POST
  // síncrono uma única vez (o generate cuida do cache + toast de erro).
  const generateMutate = generate.mutate;
  const shouldFallback = fellBack && generate.isIdle;
  useEffect(() => {
    if (shouldFallback) generateMutate();
  }, [shouldFallback, generateMutate]);

  const create = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      const { id, isNew } = await createDraft(fetcher, {
        intimationId: intimacaoId,
        actionItemId: preparation.actionItemId || undefined,
        pieceType: preparation.pieceType,
        title: preparation.objective.trim(),
        instructions: preparationInstructions(preparation),
        thesisIds: ids,
      });
      const existing = await getDraft(fetcher, id);
      // Reopening an existing draft never replaces its content.
      if (!isNew || existing.sagaState !== "CREATED" || existing.contentHtml)
        return id;
      try {
        await generateDraft(fetcher, id, ids);
      } catch {
        toast.error("Rascunho salvo. Retome a geração dentro da peça.");
      }
      return id;
    },
    onSuccess: (id) =>
      router.replace(
        `/pecas/${id}?retorno=${encodeURIComponent(params.get("retorno") ?? "/intimacoes")}`,
      ),
    onError: () =>
      toast.error(
        "Não foi possível criar a peça. Suas escolhas foram mantidas.",
      ),
  });
  const m = detalhe.model;
  const contexto: PecaContexto | null = m
    ? {
        processo: {
          cnj: m.cnj,
          classe: m.classe,
          assunto: m.assunto,
          orgao: m.orgao,
          tribunalGrau: m.tribunalGrau,
          valor: "",
        },
        intimacao: {
          id: m.id,
          tipoLabel: m.tipoLabel,
          publishedAt: m.publicadoEm,
          prazoLabel: m.fatalData || `${m.prazoNum} ${m.prazoFrase}`,
          teor: m.teor,
        },
        partes: parties.data
          ? [
              ...parties.data.autor.map((p) => ({ ...p, roleLabel: "Autor" })),
              ...parties.data.reu.map((p) => ({ ...p, roleLabel: "Réu" })),
              ...parties.data.terceiros.map((p) => ({
                ...p,
                roleLabel: "Terceiro",
              })),
            ].map((p) => ({
              name: p.name,
              roleLabel: p.roleLabel,
              isClient: false,
              counselLabel: p.counsels
                .map((c) =>
                  [c.name, c.oab ? `OAB ${c.uf} ${c.oab}` : ""]
                    .filter(Boolean)
                    .join(" · "),
                )
                .join("; "),
            }))
          : [
              {
                name: m.autor,
                roleLabel: "Autor",
                counselLabel: "",
                isClient: false,
              },
              {
                name: m.reu,
                roleLabel: "Réu",
                counselLabel: "",
                isClient: false,
              },
            ].filter((p) => p.name),
        autos: docs.documentos.map((d) => ({
          id: d.id,
          name: rotuloTipoAuto(d.document_type) || d.title,
          meta: [d.title, d.pages ? `${d.pages} pág.` : ""]
            .filter(Boolean)
            .join(" · "),
          category: d.origin === "UPLOAD" ? "Anexo" : "Autos",
          status: d.status,
        })),
      }
    : null;
  // Fonte das teses a exibir: enquanto o stream está ativo (ou parou no meio com
  // cards já mostrados), usa a lista incremental do stream; senão a lista
  // persistida (pós-`done`, ela vira autoritativa via setQueryData).
  const streamActive = stream.status === "streaming";
  const streamMidError = stream.status === "error" && stream.theses.length > 0;
  const useStreamTheses = streamActive || streamMidError;
  const sourceTheses = useStreamTheses
    ? stream.theses
    : (thesesQuery.data ?? []);
  const theses = sourceTheses.map(
    (t) =>
      ({ ...t, state: selected.has(t.id) ? "pending_add" : "off" }) as Thesis,
  );

  return {
    existingDraft: existing.data?.data ?? null,
    resume: () => {
      const id = existing.data?.data?.id;
      if (id)
        router.push(
          `/pecas/${id}?retorno=${encodeURIComponent(params.get("retorno") ?? "/intimacoes")}`,
        );
    },
    courtRecordId: m?.courtRecordId ?? "",
    contexto,
    contextoLoading: detalhe.isPending,
    teor: m?.teor ?? "",
    preparation,
    partyOptions: partyOptions(parties.data),
    loadingContext:
      detalhe.isPending ||
      parties.isPending ||
      actions.isPending ||
      existing.isPending,
    setPreparation,
    providencias,
    docs,
    theses,
    selectedCount: selected.size,
    // Não mostra o skeleton de "carregando" enquanto o stream vai preenchendo:
    // o header ao vivo + os cards que chegam já são o feedback.
    isLoading: thesesQuery.isLoading && !streamActive,
    isError: thesesQuery.isError,
    // Estado do streaming pro TesesRail (header ao vivo + card fantasma).
    streaming: streamActive ? { active: true, count: stream.count } : undefined,
    // Erro mid-stream: mantém os cards e oferece "Tentar novamente" (POST síncrono).
    streamError: streamMidError,
    toggle: (t: Thesis) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(t.id)) next.delete(t.id);
        else next.add(t.id);
        return next;
      }),
    regenerate: () => generate.mutate(),
    isRegenerating: generate.isPending,
    gerarMinuta: () => {
      if (
        preparation.objective.trim() &&
        preparation.client.trim() &&
        preparation.role
      )
        create.mutate();
    },
    isGenerating: create.isPending,
    voltar: () =>
      router.push(
        detalheNaFila(intimacaoId, params.get("retorno") ?? "/intimacoes"),
      ),
  };
}
