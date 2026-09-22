// Códigos de PRÉ-CONDIÇÃO da geração de peça que o BE devolve no envelope de erro
// ({kind, message, details:{code}}). Estes têm remédio ACIONÁVEL no FE — nunca
// mostrar a mensagem crua do BE nem um "Tente novamente" genérico: traduzimos o
// código para uma frase clara + a ação que destrava. Fonte única (Regra nº1): todo
// lugar que dispara/confirma a peça lê daqui, sem repetir o mapa.
//
// Extração do código: mesmo encadeamento do assessment-lifecycle (errCode) —
// details.code → code → kind — porque o BE serializa em posições diferentes
// conforme a borda.

/** Códigos de pré-condição conhecidos da peça (closed set espelhado do BE). */
export type PecaPreconditionCode =
  "ACT_TYPE_NOT_DEFINED" | "FULFILLMENT_NOT_CONFIRMED";

/** Ação que destrava a pré-condição — o gate/handler decide o que fazer com ela. */
export type PecaPreconditionRemedy = "confirm_act_type" | "confirm_fulfillment";

export interface PecaPreconditionInfo {
  code: PecaPreconditionCode;
  /** Frase pt-BR curta e clara (nunca a mensagem crua do BE). */
  title: string;
  /** Detalhe orientando a ação. */
  description: string;
  /** Rótulo do CTA que resolve. */
  cta: string;
  remedy: PecaPreconditionRemedy;
}

const PRECONDITIONS: Record<PecaPreconditionCode, PecaPreconditionInfo> = {
  ACT_TYPE_NOT_DEFINED: {
    code: "ACT_TYPE_NOT_DEFINED",
    title: "Confirme o tipo do ato antes de gerar a peça",
    description:
      "O tipo do ato desta intimação ainda não foi confirmado. Defina o tipo (e o prazo, se necessário) para seguir com a peça.",
    cta: "Definir o tipo do ato",
    remedy: "confirm_act_type",
  },
  FULFILLMENT_NOT_CONFIRMED: {
    code: "FULFILLMENT_NOT_CONFIRMED",
    title: "Confirme o que precisa ser feito antes de gerar a peça",
    description:
      "O trabalho desta intimação ainda não foi confirmado. Reveja o tipo e o prazo para seguir com a peça.",
    cta: "Revisar tipo e prazo",
    remedy: "confirm_fulfillment",
  },
};

function normalizeCode(raw: unknown): PecaPreconditionCode | undefined {
  if (typeof raw !== "string") return undefined;
  return raw in PRECONDITIONS ? (raw as PecaPreconditionCode) : undefined;
}

/**
 * Extrai o código de erro de um AppError da borda (fetcher). Mesmo encadeamento
 * do assessment-lifecycle: details.code → code → kind. Devolve string crua (ou
 * undefined) — use `preconditionFromError` para resolver só os conhecidos.
 */
export function extractErrorCode(e: unknown): string | undefined {
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

/** Resolve a pré-condição conhecida a partir de um erro do BE, se houver. */
export function preconditionFromError(
  e: unknown,
): PecaPreconditionInfo | undefined {
  const code = normalizeCode(extractErrorCode(e));
  return code ? PRECONDITIONS[code] : undefined;
}

/** Resolve a pré-condição conhecida a partir de um código cru, se houver. */
export function preconditionFromCode(
  code: string | undefined,
): PecaPreconditionInfo | undefined {
  const known = normalizeCode(code);
  return known ? PRECONDITIONS[known] : undefined;
}
