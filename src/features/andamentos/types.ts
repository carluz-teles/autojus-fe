// Espelha o read model do BE: GET /v1/processos/:id/andamentos → { data, page }.
// Andamentos (docket_entry) do processo — a linha do tempo capturada do DATAJUD.

export interface AndamentoView {
  id: string;
  /** Quando o ato ocorreu no tribunal (RFC3339). */
  occurred_at: string;
  /** Quando nós observamos/capturamos o ato (RFC3339). */
  observed_at: string;
  /** Código TPU (tabela processual unificada) do movimento, ou null. */
  tpu_code: number | null;
  text: string;
  source: string;
  fidelity: string;
}

// Espelha o read model do BE: GET /v1/processos/:id/activity → { data, page }.
// Atividade do escritório (análise de intimação concluída, peça gerada) —
// texto já vem pronto em PT-BR do servidor, o FE só exibe.
export interface AtividadeDoEscritorioView {
  id: string;
  event_type: "INTIMATION_ANALYSIS_COMPLETED" | "DRAFT_GENERATED";
  text: string;
  /** Quando o evento ocorreu (RFC3339). */
  occurred_at: string;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
