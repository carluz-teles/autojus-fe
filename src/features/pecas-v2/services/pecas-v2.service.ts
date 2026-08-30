// Camada de rede da Peça v2. Recebe o fetcher (ligado ao Clerk pelo useApi),
// nunca lida com token na mão. Cada função:
//   1. serializa payload snake_case pro BE
//   2. chama apiFetch<T>
//   3. desembrulha o envelope { data }
//   4. mapeia resposta snake_case → tipos de domínio v2 (via api-mapper)
//
// Assinaturas idênticas às esperadas pelos hooks (use-draft, use-iterate,
// use-chat, use-refazer, use-review). A troca dos mocks pelo real ficou
// isolada aqui.

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  mapChatMessageFromApi,
  mapPecaDetailToDraft,
  mapSectionChangeFromApi,
  mapThesisFromApi,
} from "../lib/api-mapper";
import type {
  AssumeAuthorshipResultAPI,
  ChatMessageAPI,
  ChatThreadAPI,
  DataEnvelope,
  IterateResultAPI,
  PecaDetailAPI,
  ThesesListAPI,
  ThesisAPI,
} from "../lib/api-types";
import type {
  ChatMessage,
  Draft,
  FilingApproveResult,
  FilingAttempt,
  FilingStatus,
  IterateScope,
  IterationResult,
  PendingChange,
  QuickActionKind,
  QuickAdjustKind,
  StructuredContent,
  Thesis,
  ThesisState,
} from "../types";

const ENDPOINT = "/v1/pecas";

// ── Criação (POST /v1/pecas) ─────────────────────────────────────────────────

export interface CreateDraftInput {
  /** Id da intimação de origem — o BE resolve case_id/court_record_id dela. */
  intimationId: string;
  /** Tipo da peça (opcional; o BE infere do tipo da intimação quando ausente). */
  pieceType?: string;
}

/** Cria (ou reaproveita) a peça a partir de uma intimação — POST /v1/pecas.
 *  O BE devolve 201 (nova) ou 200 (já existia) com o draft; retornamos o id. */
export async function createDraft(
  fetcher: ApiFetcher,
  input: CreateDraftInput,
): Promise<{ id: string }> {
  const res = await fetcher<DataEnvelope<{ id: string }>>(ENDPOINT, {
    method: "POST",
    body: {
      source: "intimation",
      intimation_id: input.intimationId,
      ...(input.pieceType ? { piece_type: input.pieceType } : {}),
    },
  });
  return { id: res.data.id };
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export async function getDraft(
  fetcher: ApiFetcher,
  id: string,
): Promise<Draft> {
  const res = await fetcher<DataEnvelope<PecaDetailAPI>>(`${ENDPOINT}/${id}`);
  return mapPecaDetailToDraft(res.data);
}

export async function getChatThread(
  fetcher: ApiFetcher,
  id: string,
): Promise<ChatMessage[]> {
  const res = await fetcher<DataEnvelope<ChatThreadAPI>>(
    `${ENDPOINT}/${id}/chat`,
  );
  return (res.data.messages ?? []).map(mapChatMessageFromApi);
}

// ── Teses (contrato Teses — provenance obrigatória) ──────────────────────────

/** GET /v1/pecas/:id/theses — todas as teses do rascunho, com estado. */
export async function getTheses(
  fetcher: ApiFetcher,
  id: string,
): Promise<Thesis[]> {
  const res = await fetcher<DataEnvelope<ThesesListAPI>>(
    `${ENDPOINT}/${id}/theses`,
  );
  return (res.data.theses ?? []).map(mapThesisFromApi);
}

/** POST /v1/pecas/:id/theses — (re)gera sugestões via IA, ancoradas nos
 *  attachments; PERSISTE. Novas sugestões nascem em state="off". */
export async function generateTheses(
  fetcher: ApiFetcher,
  id: string,
): Promise<Thesis[]> {
  const res = await fetcher<DataEnvelope<ThesesListAPI>>(
    `${ENDPOINT}/${id}/theses`,
    { method: "POST" },
  );
  return (res.data.theses ?? []).map(mapThesisFromApi);
}

/** PATCH /v1/pecas/:id/theses/:thesisId — muda o estado (transição validada
 *  pelo BE). Devolve a tese atualizada. */
export async function updateThesisState(
  fetcher: ApiFetcher,
  id: string,
  thesisId: string,
  state: ThesisState,
): Promise<Thesis> {
  const res = await fetcher<DataEnvelope<ThesisAPI>>(
    `${ENDPOINT}/${id}/theses/${thesisId}`,
    { method: "PATCH", body: { state } },
  );
  return mapThesisFromApi(res.data);
}

// ── Geração da minuta (POST /pecas/:id/generate) ─────────────────────────────

/** Dispara a geração da minuta com as teses selecionadas (included ∪
 *  pending_add). O worker-ai gera; o polling do saga_state acontece no hook
 *  (useDraft refetch enquanto CREATED/EXTRACTING). */
export async function generateDraft(
  fetcher: ApiFetcher,
  id: string,
  thesisIds: string[],
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/generate`, {
    method: "POST",
    body: { thesis_ids: thesisIds },
  });
}

// ── Autosave (PATCH /pecas/:id — dual write) ─────────────────────────────────

export interface SaveDraftInput {
  preambleParagraphs?: string[];
  sections?: { id: string; paragraphs: string[] }[];
}

/**
 * PATCH /v1/pecas/:id — reconstrói o structured_content COMPLETO (BE espera o
 * objeto inteiro, não patch parcial) mergindo o que veio no input com o que já
 * está no cache do React Query. Escreve também o `content` plain-text serializado
 * pra manter compatibilidade legada (dual write). Requer draft atual pra o merge.
 */
export async function saveDraft(
  fetcher: ApiFetcher,
  id: string,
  patch: SaveDraftInput,
  currentDraft: Draft,
): Promise<{ updatedAt: string }> {
  const merged = mergeIntoStructured(patch, currentDraft);
  const body = {
    content: serializeStructured(merged),
    structured_content: {
      preamble: { paragraphs: merged.preamble.paragraphs },
      sections: merged.sections.map((s) => ({
        id: s.id,
        roman: s.roman,
        title: s.title,
        short_title: s.shortTitle,
        paragraphs: s.paragraphs,
      })),
    },
  };
  const res = await fetcher<DataEnvelope<{ updated_at: string }>>(
    `${ENDPOINT}/${id}`,
    { method: "PATCH", body },
  );
  return { updatedAt: res.data.updated_at };
}

// ── Iteração (POST /pecas/:id/iterate) ───────────────────────────────────────

export async function iterateDraft(
  fetcher: ApiFetcher,
  id: string,
  scope: IterateScope,
  instruction: string,
): Promise<IterationResult> {
  const body = {
    scope: mapScopeToApi(scope),
    instruction,
  };
  const res = await fetcher<DataEnvelope<IterateResultAPI>>(
    `${ENDPOINT}/${id}/iterate`,
    { method: "POST", body },
  );
  return {
    changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)),
  };
}

export async function applyQuickAdjust(
  fetcher: ApiFetcher,
  id: string,
  scope: IterateScope,
  kind: QuickAdjustKind,
): Promise<IterationResult> {
  const body = {
    scope: mapScopeToApi(scope),
    kind,
  };
  const res = await fetcher<DataEnvelope<IterateResultAPI>>(
    `${ENDPOINT}/${id}/iterate`,
    { method: "POST", body },
  );
  return {
    changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)),
  };
}

/**
 * "Refazer seção" hoje só foca o painel Iterar (não dispara chamada). O hook
 * fica no repo pra futuras opcionalidades. Reusa iterate com scope=section +
 * instruction padrão.
 */
export async function refazerSection(
  fetcher: ApiFetcher,
  id: string,
  sectionId: string,
): Promise<IterationResult> {
  const body = {
    scope: { kind: "section", section_id: sectionId },
    instruction:
      "Refaça esta seção mantendo o mesmo conteúdo com melhor redação.",
  };
  const res = await fetcher<DataEnvelope<IterateResultAPI>>(
    `${ENDPOINT}/${id}/iterate`,
    { method: "POST", body },
  );
  return {
    changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)),
  };
}

// ── Revisão (aba "Revisão" — reusa /iterate com instruction de revisão) ─────

const REVIEW_INSTRUCTION =
  "Faça uma revisão proativa da peça — clareza, fundamentação, completude e coerência. " +
  "Sugira reescritas por seção com categoria (CLAREZA/FUNDAMENTAÇÃO/COMPLETUDE/COERÊNCIA/ÊNFASE) " +
  "e explicação curta do porquê.";

export async function runReview(
  fetcher: ApiFetcher,
  id: string,
): Promise<PendingChange[]> {
  const body = {
    scope: { kind: "whole" },
    instruction: REVIEW_INSTRUCTION,
  };
  const res = await fetcher<DataEnvelope<IterateResultAPI>>(
    `${ENDPOINT}/${id}/iterate`,
    { method: "POST", body },
  );
  return (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c));
}

// ── Chat ────────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  fetcher: ApiFetcher,
  id: string,
  question: string,
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const res = await fetcher<DataEnvelope<ChatMessageAPI>>(
    `${ENDPOINT}/${id}/chat`,
    { method: "POST", body: { question } },
  );
  // BE devolve só o turn do assistente. O turn do user já foi mostrado
  // otimistamente pelo hook via onMutate; devolvemos um sintético pra manter
  // a assinatura idêntica ao mock (o hook usa optimisticId pra reconciliar).
  const assistant = mapChatMessageFromApi(res.data);
  const user: ChatMessage = {
    id: `local-${assistant.id}-user`,
    role: "user",
    content: question,
    createdAt: assistant.createdAt,
  };
  return { user, assistant };
}

export async function runQuickAction(
  fetcher: ApiFetcher,
  id: string,
  action: QuickActionKind,
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const question = QUICK_ACTION_PROMPTS[action];
  return sendChatMessage(fetcher, id, question);
}

const QUICK_ACTION_PROMPTS: Record<QuickActionKind, string> = {
  summarize_case:
    "Resuma os autos em 3-5 linhas, destacando partes, pedido e estágio.",
  suggest_theses:
    "Sugira as principais teses jurídicas aplicáveis a este caso, ordenadas por força.",
  check_deadline:
    "Confira o prazo desta peça: qual é o termo final e se é dias úteis ou corridos.",
  find_precedents:
    "Encontre precedentes STJ/STF/tribunais relevantes pra esta peça.",
};

// ── Ações (assumir autoria + refazer do zero) ───────────────────────────────

export async function assumirAutoria(
  fetcher: ApiFetcher,
  id: string,
): Promise<{ authorship: "human_taken" }> {
  const res = await fetcher<DataEnvelope<AssumeAuthorshipResultAPI>>(
    `${ENDPOINT}/${id}/assume-authorship`,
    { method: "POST" },
  );
  return { authorship: res.data.authorship };
}

/**
 * "Refazer do zero" — chama POST /pecas/:id/generate reusando os últimos
 * parâmetros (tone/theses/instructions). O worker-ai regenera; polling do
 * saga_state acontece no hook (invalidateQueries → useDraft refetch).
 */
export async function refazerDoZero(
  fetcher: ApiFetcher,
  id: string,
): Promise<{ sagaState: "EXTRACTING" }> {
  await fetcher(`${ENDPOINT}/${id}/generate`, {
    method: "POST",
    body: {}, // vazio → BE reusa params atuais no draft row
  });
  return { sagaState: "EXTRACTING" };
}

// ── Workflow steps (Fatia 2a) ───────────────────────────────────────────────

/** "Enviar para assinatura" — marca sent_to_signing_at=now(). Idempotente. */
export async function sendToSigning(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/enviar-para-assinatura`, { method: "POST" });
}

/** Voltar pra Construção — nulla sent_to_signing_at. 404 se já assinado. */
export async function revertToConstruction(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/voltar-para-construcao`, { method: "POST" });
}

/** Autosave do editor rico (Fase B). Grava content_html direto na coluna.
 *  A partir do 1º save, content_html vira source-of-truth pro renderer PDF
 *  (Fase C, chromedp). structured_content fica congelado (a IA continua
 *  gerando pra novas gerações, mas edição humana só toca em content_html). */
export async function saveContentHtml(
  fetcher: ApiFetcher,
  id: string,
  contentHtml: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/content-html`, {
    method: "PUT",
    body: { content_html: contentHtml },
  });
}

/** Assinar peça — Fatia 2b. Gera PDF no BE, chama GCP KMS pra assinatura RSA,
 *  aplica PAdES via digitorus/pdfsign, sobe PDF assinado no storage. Requer
 *  certificate_id do certificado A1 cadastrado. Senha vem do vault (não é
 *  pedida ao user — armazenada cifrada no upload). */
export async function signPeca(
  fetcher: ApiFetcher,
  id: string,
  certificateId: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/sign`, {
    method: "POST",
    body: { certificate_id: certificateId },
  });
}

/** Marcar como protocolada — grava filed_at + filing_number opcional. */
export async function filePeca(
  fetcher: ApiFetcher,
  id: string,
  filingNumber: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${id}/file`, {
    method: "POST",
    body: { filing_number: filingNumber },
  });
}

// ── Protocolo automático (Fatia 1 — e-SAJ) ──────────────────────────────────
// NUNCA dispara sozinho: exige o clique explícito de "Protocolar automaticamente"
// (ver docs/erd-execucao-judicial-tjsp.md §16 — o RPA em si ainda está em
// calibração contra o e-SAJ real; o fallback manual do step Protocolo continua
// disponível se a credencial não estiver cadastrada ou a tentativa falhar).

interface FilingApproveResultAPI {
  filing_attempt_id: string;
  status: FilingStatus;
  is_idempotent: boolean;
}

interface FilingAttemptAPI {
  id: string;
  status: FilingStatus;
  requested_at: string;
  finished_at?: string | null;
  failure_reason?: string | null;
  filing_number?: string | null;
}

/** Aprova o protocolo automático — POST /v1/pecas/:id/filing/approve. */
export async function approveFiling(
  fetcher: ApiFetcher,
  id: string,
): Promise<FilingApproveResult> {
  const res = await fetcher<DataEnvelope<FilingApproveResultAPI>>(
    `${ENDPOINT}/${id}/filing/approve`,
    { method: "POST" },
  );
  return {
    filingAttemptId: res.data.filing_attempt_id,
    status: res.data.status,
    isIdempotent: res.data.is_idempotent,
  };
}

/** Status da tentativa de protocolo automático — GET /v1/pecas/:id/filing
 *  (null quando nunca foi solicitado). */
export async function getFilingStatus(
  fetcher: ApiFetcher,
  id: string,
): Promise<FilingAttempt | null> {
  const res = await fetcher<DataEnvelope<FilingAttemptAPI | null>>(
    `${ENDPOINT}/${id}/filing`,
  );
  if (!res.data) return null;
  return {
    id: res.data.id,
    status: res.data.status,
    requestedAt: res.data.requested_at,
    finishedAt: res.data.finished_at ?? null,
    failureReason: res.data.failure_reason ?? null,
    filingNumber: res.data.filing_number ?? null,
  };
}

// ── Anexos (POST/DELETE /pecas/:id/anexos) ────────────────────────────────────

/** Categorias de anexo — casadas com o CHECK do BE (migração 0043) e o enum
 *  `AttachmentCategory` em internal/draft/entity.go. */
export type AttachmentCategory =
  | "Procuração"
  | "Comprovante de endereço"
  | "Contrato"
  | "Provas documentais"
  | "Declaração de hipossuficiência"
  | "Outro";

export const ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  "Procuração",
  "Comprovante de endereço",
  "Contrato",
  "Provas documentais",
  "Declaração de hipossuficiência",
  "Outro",
];

/** Vincula um documento já uploadado (via document slice) à peça, com categoria. */
export async function attachDocument(
  fetcher: ApiFetcher,
  draftId: string,
  documentId: string,
  category: AttachmentCategory,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${draftId}/anexos`, {
    method: "POST",
    body: { document_id: documentId, category },
  });
}

/** Remove o vínculo peça↔documento. O documento em si permanece (owned pelo slice document). */
export async function removeAttachment(
  fetcher: ApiFetcher,
  draftId: string,
  attachmentId: string,
): Promise<void> {
  await fetcher(`${ENDPOINT}/${draftId}/anexos/${attachmentId}`, {
    method: "DELETE",
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapScopeToApi(scope: IterateScope): {
  kind: string;
  section_id?: string;
} {
  if (scope.kind === "section") {
    return { kind: "section", section_id: scope.id };
  }
  return { kind: "whole" };
}

/** Reconstrói o structured completo aplicando o patch (só o que mudou). */
function mergeIntoStructured(
  patch: SaveDraftInput,
  current: Draft,
): StructuredContent {
  const preamble = patch.preambleParagraphs
    ? { paragraphs: patch.preambleParagraphs }
    : { paragraphs: current.preamble.paragraphs };

  const patched = new Map<string, string[]>();
  for (const s of patch.sections ?? []) {
    patched.set(s.id, s.paragraphs);
  }

  const sections = current.sections.map((s) => ({
    ...s,
    paragraphs: patched.has(s.id) ? patched.get(s.id)! : s.paragraphs,
  }));

  return { preamble, sections };
}

/** Serializa o structured num plain text semelhante ao que o generate produz.
 *  Preâmbulo (parágrafos separados por \n\n) + cada seção com heading romano. */
function serializeStructured(s: StructuredContent): string {
  const parts: string[] = [];
  parts.push(...s.preamble.paragraphs);
  for (const sec of s.sections) {
    parts.push(`${sec.roman} — ${sec.title}`);
    parts.push(...sec.paragraphs);
  }
  return parts.join("\n\n");
}
