"use client";

// Hook do PRE-FLIGHT da geração de peça. A análise da intimação é horizontal/
// cosmética e NUNCA bloqueia a peça — o gate real roda AQUI, ao clicar "Gerar peça":
//  · Check 1 (tipo do ato): quando o tipo ainda não foi confirmado, o gate exige
//    a confirmação inline (reusa o control de definir tipo) antes de seguir.
//  · Check 2 (autos): consulta GET /processos/:id/autos-status. Sem autos é só um
//    AVISO de qualidade (não bloqueia) — o gate oferece o caminho certo conforme o
//    estado do tribunal/busca, e sempre permite "Gerar mesmo assim".
// O componente chama só este hook (JSX + binding).

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSyncAutos } from "@/features/configuracoes/hooks/use-sync-autos";
import { useApi } from "@/lib/api/use-api";

import {
  getAutosStatus,
  priorizarAutos,
} from "../../intimacoes/services/autos-status.service";

/** Caminho ACIONÁVEL oferecido quando o processo está sem autos carregados. */
export type AutosPath =
  | "configure" // tribunal não configurado (mas disponível) → Configurar tribunal
  | "prioritize" // busca em andamento → Priorizar intimação
  | "fetch" // tribunal configurado, sem busca → Buscar autos
  | "unavailable"; // integração indisponível — só "Gerar mesmo assim"

export interface UsePecaGateParams {
  open: boolean;
  intimacaoId: string;
  processoId: string;
  /** Grau do processo (G1|JE|…) — recorte da cobertura da busca de autos. */
  degree?: string;
  /** true quando o tipo do ato JÁ está confirmado (Check 1 satisfeito de saída). */
  tipoConfirmado: boolean;
}

export function usePecaGate({
  open,
  intimacaoId,
  processoId,
  degree,
  tipoConfirmado,
}: UsePecaGateParams) {
  const api = useApi();

  // Status dos autos — só busca com o gate aberto (não paga a chamada à toa).
  const status = useQuery({
    queryKey: ["autos-status", processoId],
    queryFn: () => getAutosStatus(api, processoId),
    enabled: open && !!processoId,
    staleTime: 15_000,
  });

  // Caminho "Buscar autos" — reusa o motor de sincronização já existente (mesmo
  // endpoint/polling do cockpit e das Configurações), escopado a este processo.
  const sync = useSyncAutos({ courtRecordId: processoId, degree });

  const prioritize = useMutation({
    mutationFn: () => priorizarAutos(api, intimacaoId),
    onSuccess: () =>
      toast.success("Esta intimação foi priorizada na busca de autos."),
    onError: () =>
      toast.error("Não foi possível priorizar agora. Tente novamente."),
  });

  const s = status.data;
  const hasAutos = s?.has_autos ?? false;

  // Deriva o caminho acionável quando faltam autos (só relevante com status pronto).
  const autosPath: AutosPath = !s
    ? "unavailable"
    : !s.tribunal_available
      ? "unavailable"
      : !s.tribunal_configured
        ? "configure"
        : s.fetch_running
          ? "prioritize"
          : "fetch";

  return {
    // Check 1 — tipo do ato
    precisaTipo: !tipoConfirmado,

    // Check 2 — autos
    statusPendente: open && !!processoId && status.isPending,
    statusErro: status.isError,
    recarregarStatus: () => void status.refetch(),
    hasAutos,
    court: s?.court ?? "",
    autosPath,

    // Ações do caminho de autos
    onPriorizar: () => prioritize.mutate(),
    priorizando: prioritize.isPending,
    priorizado: prioritize.isSuccess,

    // Buscar autos (reuso do SyncAutos) — só o essencial pro botão do gate.
    onBuscarAutos: () => sync.mutation.mutate(),
    buscandoAutos: sync.mutation.isPending || sync.requesting,
    buscaPendente: sync.pending,
    buscaMotivo: sync.reason,
  };
}
