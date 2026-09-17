// Contrato de rede remanescente da feature Peça v1 (o fluxo de peça vive em
// pecas-v2). Sobraram os tipos das duas operações ainda usadas: listar peças de
// um processo e o resultado do protocolo manual.

/** Coverage summary do review (grounded/chunks/suggestions). */
interface PecaCoverageSummary {
  grounded: boolean;
  chunks_used: number;
  suggestions_total: number;
}

/** Item da lista paginada — GET /v1/pecas ou GET /v1/processos/:id/pecas. */
export interface PecaListItem {
  id: string;
  piece_type: string;
  title: string;
  status: string;
  saga_state: string;
  coverage_summary: PecaCoverageSummary | null;
  sent_to_signing_at?: string | null;
  signed_at?: string | null;
  filed_at: string | null;
  observed_result: string | null;
  created_at: string;
  /** CNJ do processo (join com court_record) — string vazia quando indisponível. */
  cnj_number?: string;
  /** Nome do autor da peça (join com app_user via created_by) — vazio pra
   *  peças pré-migration 0063 ou usuário removido do escritório. */
  responsible_name?: string;
  /** Prazo da intimação de origem — nil quando não há deadline derivado.
   *  end_date: "YYYY-MM-DD"; days_left = end_date - hoje (negativo = atrasado). */
  deadline_end_date?: string | null;
  deadline_days_left?: number | null;
}

/** Resposta do POST /v1/pecas/:id/file. */
export interface PecaFileResult {
  petition_id: string;
  draft_id: string;
  filed_at: string;
  receipt: Record<string, unknown>;
}
