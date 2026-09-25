// Ciclo de vida da CONFERÊNCIA DAS FONTES (assessment) → GERAÇÃO.
//
// O BE (internal/draft) exige uma conferência validada antes do POST /generate;
// sem ela o generate devolve 409 (assessment_required / assessment_stale). Este
// helper roda a sequência OBRIGATÓRIA como UMA única fonte de verdade, para que o
// fluxo AUTO (construction-entry) e o manual (use-construction/gerarMinuta) usem
// EXATAMENTE o mesmo input em request → validate → generate:
//
//   1. POST   /pecas/:id/assessment            {input}                 → 202 (queued)
//   2. POLL   GET /pecas/:id/assessment        (~1s)  até succeeded + Assessment
//   3. POST   /pecas/:id/assessment/:aid/validate {expected_hash, fp, input}
//   4. POST   /pecas/:id/generate              {assessment_*, thesis_ids, instructions}
//
// CRÍTICO: o `input` (thesis_ids/instructions/tone) é IDÊNTICO nas 3 chamadas —
// construído UMA vez por tentativa (buildAssessmentInput) e passado adiante. Um
// input divergente faz o BE responder assessment_stale.
//
// Sem timers de UI: a duração real das chamadas REST (request + poll + validate)
// é o próprio sinal observável da fase 2 ("Reunindo o contexto"). O `onPhase`
// callback deixa o loader refletir a transição de fase por sinal real.

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  type AssessmentInput,
  type GenerateAssessmentBinding,
  generateDraft,
  getAssessment,
  requestAssessment,
  validateAssessment,
} from "../services/pecas-v2.service";

/** Erro tipado do ciclo — carrega uma etapa para o caller decidir a mensagem. */
export class AssessmentLifecycleError extends Error {
  constructor(
    message: string,
    readonly step: "request" | "poll" | "validate" | "generate",
    readonly code?: string,
  ) {
    super(message);
    this.name = "AssessmentLifecycleError";
  }
}

export interface RunAssessmentGenerateOptions {
  /** current_version_id do draft (null quando nunca gerou). OCC guard do generate. */
  expectedCurrentVersionId: string | null;
  /** Substituição de conteúdo existente (regeração): passa a revision atual. */
  replacement?: { revision: string };
  /** Sinaliza a transição da fase 2 (assessment) para o loader — sem timers. */
  onAssessmentStarted?: () => void;
  /** Intervalo de poll em ms (default 1000). */
  pollIntervalMs?: number;
  /** Timeout total do poll em ms (default 120000 = 2 min). */
  pollTimeoutMs?: number;
  /** Injeção para teste — evita setTimeout real. */
  sleep?: (ms: number) => Promise<void>;
  /** Injeção para teste — relógio. */
  now?: () => number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Roda o ciclo completo assessment → generate. Retorna o resultado do generate
 * (202: {updated_at?}). Lança AssessmentLifecycleError em qualquer falha, sem
 * jamais chamar generate se a conferência não ficou pronta e validada.
 */
export async function runAssessmentAndGenerate(
  fetcher: ApiFetcher,
  draftId: string,
  input: AssessmentInput,
  opts: RunAssessmentGenerateOptions,
): Promise<{ updated_at?: string }> {
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const interval = opts.pollIntervalMs ?? 1000;
  const timeout = opts.pollTimeoutMs ?? 120_000;

  // Fase 2 começa: a conferência é a janela observável entre "teses" e "autos".
  opts.onAssessmentStarted?.();

  // 1. Enfileira a conferência (202 async).
  try {
    await requestAssessment(fetcher, draftId, input);
  } catch (e) {
    throw new AssessmentLifecycleError(
      "Não foi possível iniciar a conferência das fontes.",
      "request",
      errCode(e),
    );
  }

  // 2. Poll até succeeded + Assessment presente (ou failed / timeout).
  const deadline = now() + timeout;
  let assessmentId = "";
  let contentHash = "";
  let inputFingerprint = "";
  for (;;) {
    let state;
    try {
      state = await getAssessment(fetcher, draftId);
    } catch (e) {
      throw new AssessmentLifecycleError(
        "Não foi possível acompanhar a conferência das fontes.",
        "poll",
        errCode(e),
      );
    }
    const status = state.request?.status;
    if (status === "failed") {
      throw new AssessmentLifecycleError(
        state.request?.error?.message ??
          "A conferência das fontes falhou. Tente novamente.",
        "poll",
        state.request?.error?.code,
      );
    }
    if (status === "superseded") {
      throw new AssessmentLifecycleError(
        "A conferência foi substituída por uma nova. Tente novamente.",
        "poll",
        "superseded",
      );
    }
    // Pronto quando o pedido concluiu E a conferência está presente.
    if (
      (status === "succeeded" || status == null) &&
      state.assessment &&
      !state.needs_refresh
    ) {
      assessmentId = state.assessment.id;
      contentHash = state.assessment.content_hash;
      inputFingerprint = state.assessment.input_fingerprint;
      break;
    }
    if (now() >= deadline) {
      throw new AssessmentLifecycleError(
        "A conferência das fontes demorou mais que o esperado. Tente novamente.",
        "poll",
        "timeout",
      );
    }
    await sleep(interval);
  }

  // 3. Valida (auto-validate silencioso — registra o usuário atual como
  //    validated_by; sem tela de revisão bloqueante). Input IDÊNTICO.
  try {
    await validateAssessment(
      fetcher,
      draftId,
      assessmentId,
      contentHash,
      inputFingerprint,
      input,
    );
  } catch (e) {
    throw new AssessmentLifecycleError(
      "Não foi possível validar a conferência das fontes.",
      "validate",
      errCode(e),
    );
  }

  // 4. Gera com o binding da conferência validada. Input IDÊNTICO.
  const binding: GenerateAssessmentBinding = {
    assessmentVersionId: assessmentId,
    assessmentContentHash: contentHash,
    inputFingerprint,
    expectedCurrentVersionId: opts.expectedCurrentVersionId,
  };
  try {
    return await generateDraft(
      fetcher,
      draftId,
      input.thesisIds,
      input.instructions,
      binding,
      opts.replacement,
    );
  } catch (e) {
    throw new AssessmentLifecycleError(
      "Não foi possível iniciar a geração da peça.",
      "generate",
      errCode(e),
    );
  }
}

/** Extrai o `kind`/code de um AppError da borda (fetcher), quando disponível. */
function errCode(e: unknown): string | undefined {
  if (e && typeof e === "object") {
    const anyErr = e as {
      kind?: string;
      code?: string;
      details?: { code?: string };
    };
    return anyErr.details?.code ?? anyErr.code ?? anyErr.kind;
  }
  return undefined;
}
