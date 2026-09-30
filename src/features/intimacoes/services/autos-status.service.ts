import type { ApiFetcher } from "@/lib/api/use-api";

import type { AutosFetchResultCode } from "../lib/autos-fetch-result";

export type { AutosFetchResultCode } from "../lib/autos-fetch-result";

// Camada de rede do PRE-FLIGHT de geração de peça. Duas chamadas:
//  · GET /v1/processos/:id/autos-status → o estado dos autos daquele processo
//    (carregados? tribunal configurado/disponível? busca em andamento?). Alimenta
//    o aviso de qualidade da peça (autos ausentes) e decide QUAL caminho oferecer.
//  · POST /v1/intimacoes/:id/priorizar-autos → sobe a busca de autos deste
//    processo pro topo da fila (quando já há uma busca rodando). 200 sem corpo útil.
// Recebe o fetcher (ligado ao Clerk pelo useApi); não conhece React nem cache.

/**
 * Estado dos autos de um processo — GET /v1/processos/:id/autos-status. Espelha o
 * read model do BE. Dirige o pre-flight: quando `has_autos` é falso a peça sai com
 * aviso de qualidade, e os campos de tribunal/busca decidem o CTA oferecido.
 */
export interface AutosStatus {
  /** Autos do processo já carregados (documentos disponíveis). */
  has_autos: boolean;
  /** O tribunal do processo já tem conexão configurada (certificado + 2FA). */
  tribunal_configured: boolean;
  /** O tribunal tem integração de importação automática disponível. */
  tribunal_available: boolean;
  /** Já existe uma busca de autos em andamento para este processo. */
  fetch_running: boolean;
  /** Sigla do tribunal (ex.: "TJSP"); "" quando não derivado. */
  court: string;
  /** Sistema do tribunal (ex.: "EPROC"); null quando não derivado. */
  system: string | null;
  /** Etapa corrente do pipeline de autos. */
  autos_stage: "none" | "queued" | "fetching" | "extracting" | "ready";
  /** Há ao menos um documento com texto pronto para geração de peça. */
  peca_ready: boolean;
  /** O processo foi admitido pelo gate de necessidade de autos. */
  autos_needed: boolean;
  /** Documentos judiciais persistidos para o processo. */
  documents_total: number;
  /** Documentos judiciais que já possuem texto utilizável. */
  documents_with_text: number;
  /** Resultado durável da consulta, disponível também após recarregar a página. */
  last_fetch_status?: "none" | "pending" | "completed" | "failed";
  /** Código estável do último resultado ou falha; null para histórico sem evidência. */
  fetch_result_code?: AutosFetchResultCode | null;
  /** Horário da última consulta concluída, inclusive quando nenhum auto foi obtido. */
  last_checked_at?: string;
  /** Horário da última falha terminal. */
  last_failure_at?: string;
  /** Progresso agregado da importação enquanto ela estiver em execução. */
  fetch_progress?: { expected: number; done: number; errors: number };
}

/** Estado dos autos de um processo — para o pre-flight da geração de peça. */
export async function getAutosStatus(
  fetcher: ApiFetcher,
  processoId: string,
): Promise<AutosStatus> {
  return fetcher<AutosStatus>(`/v1/processos/${processoId}/autos-status`);
}

/**
 * Prioriza a busca de autos desta intimação — POST /v1/intimacoes/:id/priorizar-autos.
 * Sobe o processo desta intimação pro topo da fila de busca de autos. 200 (sem corpo
 * útil); só faz sentido quando já há uma busca em andamento (`fetch_running`).
 */
export async function priorizarAutos(
  fetcher: ApiFetcher,
  intimacaoId: string,
): Promise<void> {
  return fetcher<void>(`/v1/intimacoes/${intimacaoId}/priorizar-autos`, {
    method: "POST",
  });
}
