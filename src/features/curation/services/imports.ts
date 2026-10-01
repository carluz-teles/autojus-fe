import type { ApiFetcher } from "@/lib/api/use-api";

export interface CommercialTypeContext {
  schema_version: "intimation-commercial-type-v1";
  document_type: string | null;
  communication_kind: string | null;
  intimation_type: string | null;
  declared_deadline: string | null;
}
export interface ImportContext {
  court: string;
  procedure: string;
  channel: string;
  legal_date: string | null;
  publication_date: string | null;
  recipient_role: string | null;
  notes: string | null;
  commercial_type?: CommercialTypeContext | null;
}
export interface ImportInput {
  text: string;
  origin: string;
  source_kind: string;
  source_reference: string;
  captured_at: string;
  group_key: string;
  context: ImportContext;
}
export interface ImportItem {
  id: string;
  row_number: number;
  input: ImportInput;
  snapshot_digest: string;
  state: string;
  errors: string[];
  duplicate_rows: number[];
  duplicate_ids: string[];
}
export interface ImportBatch {
  id: string;
  name: string;
  schema_version: string;
  state: string;
  revision: number;
  created_at: string;
  counts: Record<string, number>;
  items: ImportItem[];
}
export interface ImportBatchSummary {
  id: string;
  name: string;
  state: string;
  revision: number;
  item_count: number;
  created_at: string;
}
export interface ImportReceipt {
  request_id: string;
  batch: ImportBatch;
  replayed: boolean;
}
export interface ImportCommand {
  request_id: string;
  expected_revision: number;
  action: "confirm" | "cancel";
  selection: { item_id: string; duplicate_reason: string }[];
  reason: string;
}
export interface ImportPage {
  data: ImportBatchSummary[];
  page: { next_cursor: string | null; limit: number };
}

// Preserve the raw array all the way to the strict server decoder. Parsing and
// re-stringifying an uploaded file would silently discard duplicate JSON keys.
export function buildImportBody(
  requestId: string,
  name: string,
  rawItems: string,
) {
  const parsed: unknown = JSON.parse(rawItems);
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100)
    throw new Error("Informe uma lista JSON com entre 1 e 100 itens.");
  const body = `{"request_id":${JSON.stringify(requestId)},"schema_version":"intimation-import-v1","name":${JSON.stringify(name)},"items":${rawItems}}`;
  if (new TextEncoder().encode(body).length > 2 << 20)
    throw new Error("O lote deve ter até 2 MiB.");
  return body;
}
export async function readImportFile(file: File) {
  if (file.size === 0 || file.size > 2 << 20)
    throw new Error("Escolha um arquivo JSON não vazio de até 2 MiB.");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await file.arrayBuffer(),
  );
}
export async function stageImport(api: ApiFetcher, body: string) {
  return (
    await api<{ data: ImportReceipt }>("/v1/curation/imports", {
      method: "POST",
      serializedJson: body,
    })
  ).data;
}
export async function getImport(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return (
    await api<{ data: ImportBatch }>(
      `/v1/curation/imports/${encodeURIComponent(id)}`,
      { signal },
    )
  ).data;
}
export function listImports(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<ImportPage>(
    `/v1/curation/imports?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { signal },
  );
}
export async function commandImport(
  api: ApiFetcher,
  id: string,
  command: ImportCommand,
) {
  return (
    await api<{ data: ImportReceipt }>(
      `/v1/curation/imports/${encodeURIComponent(id)}/commands`,
      { method: "POST", body: command },
    )
  ).data;
}
export function importStateLabel(state: string) {
  return (
    (
      {
        staged: "Aguardando confirmação",
        confirmed: "Seleção confirmada",
        cancelled: "Cancelado",
        invalid: "Corrigir origem",
        duplicate_candidate: "Possível duplicata",
        awaiting_privacy: "Revisão de privacidade pendente",
        admitted: "Admitido",
        rejected: "Rejeitado",
      } as Record<string, string>
    )[state] ?? state
  );
}
export function canSelectImport(item: ImportItem) {
  return item.state === "staged" || item.state === "duplicate_candidate";
}

export function importIssueLabel(code: string) {
  if (code === "invalid_item_schema")
    return "Formato do item inválido: confira os nomes e tipos dos campos no exemplo.";
  return (
    (
      {
        text_empty: "Texto vazio",
        text_invalid_or_too_large: "Texto inválido ou maior que 128 KiB",
        origin_required: "Declare se o caso é real ou sintético",
        source_kind_invalid: "Tipo de fonte inválido",
        source_reference_required: "Referência da fonte ausente ou inválida",
        group_key_required: "Grupo do processo ausente ou inválido",
        captured_at_invalid: "Data da captura inválida",
        captured_at_future: "Data da captura está no futuro",
        context_court_required: "Tribunal ausente",
        context_procedure_required: "Procedimento ausente",
        context_channel_required: "Canal ausente",
        context_date_invalid: "Data do contexto inválida",
        context_text_invalid: "Texto do contexto inválido",
      } as Record<string, string>
    )[code] ?? "Confira os campos da origem."
  );
}
