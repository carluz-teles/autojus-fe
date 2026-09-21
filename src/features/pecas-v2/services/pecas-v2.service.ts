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
  mapThesisFromApi,
} from "../lib/api-mapper";
import type {
  AssessmentInputAPI,
  AssessmentRequestStateAPI,
  AssessmentStateAPI,
  ChatMessageAPI,
  ChatThreadAPI,
  DataEnvelope,
  PecaDetailAPI,
  ThesisAPI,
} from "../lib/api-types";
import type { ChatMessage, Draft, Thesis, ThesisState } from "../types";

const ENDPOINT = "/v1/pecas";

// ── Criação (POST /v1/pecas) ─────────────────────────────────────────────────

export interface CreateDraftInput {
  actionItemId?: string;
  instructions?: string;
  title?: string;
  /** Id da intimação de origem — o BE resolve case_id/court_record_id dela. */
  intimationId: string;
  /** Tipo da peça (opcional; o BE infere do tipo da intimação quando ausente). */
  pieceType?: string;
  /** Teses (intimation-scoped) selecionadas na PARTIDA — o BE semeia draft_thesis
   *  como `included`. É o "Gerar minuta": só aqui a peça materializa. */
  thesisIds?: string[];
}

/** Materializa a peça a partir de uma intimação — POST /v1/pecas. Chamado ao abrir
 *  a construção. O BE devolve 201 (nova) ou 200 (já
 *  existia) com o draft; retornamos o id. */
export async function createDraft(
  fetcher: ApiFetcher,
  input: CreateDraftInput,
): Promise<{ id: string; isNew: boolean }> {
  const res = await fetcher<DataEnvelope<{ id: string; is_new: boolean }>>(
    ENDPOINT,
    {
      method: "POST",
      body: {
        source: "intimation",
        intimation_id: input.intimationId,
        action_item_id: input.actionItemId,
        instructions: input.instructions,
        title: input.title,
        ...(input.pieceType ? { piece_type: input.pieceType } : {}),
        ...(input.thesisIds && input.thesisIds.length
          ? { thesis_ids: input.thesisIds }
          : {}),
      },
    },
  );
  return { id: res.data.id, isNew: res.data.is_new };
}

// ── Teses da PARTIDA (intimation-scoped, sem draft) ──────────────────────────

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
  const res = await fetcher<DataEnvelope<ThesisAPI[]>>(
    `${ENDPOINT}/${id}/theses`,
  );
  return (res.data ?? []).map(mapThesisFromApi);
}

/** POST /v1/pecas/:id/theses — (re)gera sugestões via IA, ancoradas nos
 *  attachments; PERSISTE. Novas sugestões nascem em state="off". */
export async function generateTheses(
  fetcher: ApiFetcher,
  id: string,
  onlyIfStale = false,
): Promise<Thesis[]> {
  const res = await fetcher<DataEnvelope<ThesisAPI[]>>(
    `${ENDPOINT}/${id}/theses`,
    {
      method: "POST",
      query: onlyIfStale ? { only_if_stale: true } : undefined,
    },
  );
  return (res.data ?? []).map(mapThesisFromApi);
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

/** Dados da conferência (assessment) ligados a uma geração. Obrigatórios: o BE
 *  barra o generate com `assessment_required`/`assessment_stale` sem eles. Os
 *  três primeiros vêm da conferência validada; `expectedCurrentVersionId` é o
 *  `current_version_id` do draft (null quando nunca gerou — chave presente com
 *  valor null; o BE aceita e casa com o current vazio). */
export interface GenerateAssessmentBinding {
  assessmentVersionId: string;
  assessmentContentHash: string;
  inputFingerprint: string;
  expectedCurrentVersionId: string | null;
}

/** Dispara a geração da minuta com as teses selecionadas (included ∪
 *  pending_add). O worker-ai gera; o polling do saga_state acontece no hook
 *  (useDraft refetch enquanto CREATED/EXTRACTING).
 *
 *  `assessment` é OBRIGATÓRIO no fluxo atual: o BE exige uma conferência das
 *  fontes validada antes do generate (senão 409 assessment_required). O
 *  `thesis_ids`/`instructions` devem ser IDÊNTICOS ao input da conferência.
 *
 *  NB: o BE deriva `assessment_validation_id` do próprio registro da conferência
 *  — NÃO se envia no corpo (o decode do BE rejeita campos desconhecidos). */
export async function generateDraft(
  fetcher: ApiFetcher,
  id: string,
  thesisIds: string[],
  instructions?: string,
  assessment?: GenerateAssessmentBinding,
  replacement?: { revision: string },
): Promise<{ updated_at: string }> {
  const response = await fetcher<DataEnvelope<{ updated_at: string }>>(
    `${ENDPOINT}/${id}/generate`,
    {
      method: "POST",
      body: {
        thesis_ids: thesisIds,
        instructions,
        ...(assessment
          ? {
              assessment_version_id: assessment.assessmentVersionId,
              assessment_content_hash: assessment.assessmentContentHash,
              input_fingerprint: assessment.inputFingerprint,
              // Chave sempre presente quando há assessment (o BE exige); null
              // para fresh draft (current_version_id vazio no BE).
              expected_current_version_id:
                assessment.expectedCurrentVersionId ?? null,
            }
          : {}),
        ...(replacement
          ? { replace_existing: true, revision: replacement.revision }
          : {}),
      },
    },
  );
  return response.data;
}

// ── Conferência das fontes (assessment) — gate obrigatório antes do generate ──

/** Input canônico da conferência. UMA fonte de verdade por tentativa de generate
 *  — o MESMO objeto vai para request, validate E generate (senão assessment_stale).
 *  tone default "tecnico" para casar com o default server-side do generate. */
export interface AssessmentInput {
  thesisIds: string[];
  instructions: string;
  tone: string;
}

/** Monta o input canônico com defaults (tone "tecnico" = default do generate). */
export function buildAssessmentInput(
  thesisIds: string[],
  instructions: string,
  tone = "tecnico",
): AssessmentInput {
  return { thesisIds, instructions: instructions.trim(), tone };
}

function assessmentInputBody(input: AssessmentInput): AssessmentInputAPI {
  return {
    thesis_ids: input.thesisIds,
    instructions: input.instructions,
    tone: input.tone,
  };
}

/** POST /v1/pecas/:id/assessment — enfileira a conferência (202 async). Devolve
 *  o estado do pedido (status queued/running). */
export async function requestAssessment(
  fetcher: ApiFetcher,
  id: string,
  input: AssessmentInput,
): Promise<AssessmentRequestStateAPI> {
  const res = await fetcher<
    DataEnvelope<{ request: AssessmentRequestStateAPI }>
  >(`${ENDPOINT}/${id}/assessment`, {
    method: "POST",
    body: { input: assessmentInputBody(input) },
  });
  return res.data.request;
}

/** GET /v1/pecas/:id/assessment — estado da conferência (para polling). */
export async function getAssessment(
  fetcher: ApiFetcher,
  id: string,
): Promise<AssessmentStateAPI> {
  const res = await fetcher<DataEnvelope<AssessmentStateAPI>>(
    `${ENDPOINT}/${id}/assessment`,
  );
  return res.data;
}

/** POST /v1/pecas/:id/assessment/:aid/validate — registra o usuário atual como
 *  validated_by (sem revisor separado, sem edição obrigatória). O `input` deve
 *  ser IDÊNTICO ao usado no request. */
export async function validateAssessment(
  fetcher: ApiFetcher,
  id: string,
  assessmentId: string,
  expectedContentHash: string,
  expectedInputFingerprint: string,
  input: AssessmentInput,
): Promise<AssessmentStateAPI> {
  const res = await fetcher<DataEnvelope<AssessmentStateAPI>>(
    `${ENDPOINT}/${id}/assessment/${assessmentId}/validate`,
    {
      method: "POST",
      body: {
        expected_content_hash: expectedContentHash,
        expected_input_fingerprint: expectedInputFingerprint,
        input: assessmentInputBody(input),
      },
    },
  );
  return res.data;
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
    citations: [],
    grounded: false,
  };
  return { user, assistant };
}
