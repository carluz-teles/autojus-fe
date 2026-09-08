import type { FilingAttempt, FilingStatus } from "./types";

export const FILING_LABEL: Record<FilingStatus, string> = {
  ENFILEIRADO: "Protocolo na fila",
  PROTOCOLANDO: "Enviando ao tribunal",
  CONFIRMACAO_PENDENTE: "Protocolo aguardando confirmação",
  PROTOCOLADO: "Peça protocolada",
  FALHOU: "Protocolo não realizado",
};

export function filingPresentation(attempt: FilingAttempt) {
  const confirmed = attempt.status === "PROTOCOLADO";
  const uncertain = attempt.status === "CONFIRMACAO_PENDENTE";
  return {
    label: FILING_LABEL[attempt.status] ?? "Situação do protocolo indisponível",
    confirmed,
    // A receipt number alone is insufficient: local finalization can still be pending.
    receiptLabel: confirmed
      ? "Número do protocolo"
      : "Referência retornada pelo tribunal",
    message: uncertain
      ? "O envio pode ter sido recebido, mas a confirmação ainda não foi concluída. Confira o recibo no tribunal antes de qualquer novo envio."
      : attempt.status === "ENFILEIRADO" || attempt.status === "PROTOCOLANDO"
        ? "Acompanhe esta tentativa. Um novo envio está bloqueado enquanto o protocolo está em andamento."
        : confirmed
          ? "O tribunal confirmou o recebimento da peça."
          : attempt.status === "FALHOU"
            ? "A tentativa não foi concluída. Confira o motivo antes de iniciar outro envio."
            : "Atualize o acompanhamento antes de qualquer novo envio.",
  };
}

/** Fail closed for active, confirmed and unknown future states. */
export function blocksNewFiling(attempt: FilingAttempt | null): boolean {
  return attempt !== null && attempt.status !== "FALHOU";
}
