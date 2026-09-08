/** Filing attempt lifecycle; separate from draft status/saga_state. */
export type FilingStatus =
  | "ENFILEIRADO"
  | "PROTOCOLANDO"
  | "CONFIRMACAO_PENDENTE"
  | "PROTOCOLADO"
  | "FALHOU";

export interface FilingAttempt {
  id: string;
  draft_id: string;
  status: FilingStatus;
  requested_at: string;
  finished_at: string | null;
  failure_reason: string;
  filing_number: string;
}
