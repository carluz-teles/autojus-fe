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
} from "../lib/api-mapper";
import type {
  AssumeAuthorshipResultAPI,
  ChatMessageAPI,
  ChatThreadAPI,
  DataEnvelope,
  IterateResultAPI,
  PecaDetailAPI,
} from "../lib/api-types";
import type {
  ChatMessage,
  Draft,
  IterateScope,
  IterationResult,
  PendingChange,
  QuickActionKind,
  QuickAdjustKind,
  StructuredContent,
} from "../types";

const ENDPOINT = "/v1/pecas";

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
  return { changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)) };
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
  return { changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)) };
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
    instruction: "Refaça esta seção mantendo o mesmo conteúdo com melhor redação.",
  };
  const res = await fetcher<DataEnvelope<IterateResultAPI>>(
    `${ENDPOINT}/${id}/iterate`,
    { method: "POST", body },
  );
  return { changes: (res.data.changes ?? []).map((c) => mapSectionChangeFromApi(c)) };
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
  summarize_case: "Resuma os autos em 3-5 linhas, destacando partes, pedido e estágio.",
  suggest_theses: "Sugira as principais teses jurídicas aplicáveis a este caso, ordenadas por força.",
  check_deadline: "Confira o prazo desta peça: qual é o termo final e se é dias úteis ou corridos.",
  find_precedents: "Encontre precedentes STJ/STF/tribunais relevantes pra esta peça.",
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
