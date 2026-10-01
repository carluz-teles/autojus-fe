import { ApiError } from "@/lib/api/errors";

export function feedbackErrorCode(error: unknown) {
  if (
    !(error instanceof ApiError) ||
    !error.details ||
    typeof error.details !== "object"
  )
    return "";
  return "code" in error.details ? String(error.details.code) : "";
}
export function feedbackWait(error: unknown) {
  if (!(error instanceof ApiError)) return 0;
  if (error.status !== 429 && feedbackErrorCode(error) !== "result_not_ready")
    return 0;
  const detail =
    error.details &&
    typeof error.details === "object" &&
    "retry_after_seconds" in error.details
      ? error.details.retry_after_seconds
      : undefined;
  return (
    error.retryAfterSeconds ??
    (typeof detail === "number" && Number.isFinite(detail) && detail > 0
      ? detail
      : error.status === 429
        ? 60
        : 2)
  );
}
export function feedbackAccessError(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}
export function retainFeedbackCommand(error: unknown) {
  return (
    !(error instanceof ApiError) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.status === 429 ||
    feedbackErrorCode(error) === "result_not_ready"
  );
}
export function feedbackFailureMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Sua sessão expirou. Entre novamente para avaliar.";
    if ([403, 404].includes(error.status))
      return "O feedback desta resposta está indisponível para você.";
    if (error.status === 429)
      return "Muitas alterações seguidas. Aguarde para tentar novamente.";
    if (feedbackErrorCode(error) === "result_not_ready")
      return "Esta resposta ainda está sendo sincronizada. Tente novamente em instantes.";
    if (feedbackErrorCode(error) === "revision_conflict")
      return "Seu voto mudou em outra aba. Confira o estado atualizado antes de enviar novamente.";
    if (error.status === 409)
      return "Não foi possível confirmar esta alteração. Atualize o feedback antes de enviar novamente.";
    if ([400, 422].includes(error.status))
      return "Confira os campos e reduza o tamanho do comentário ou da correção.";
  }
  return "Não foi possível confirmar o envio. Tente novamente para recuperar o mesmo pedido.";
}
