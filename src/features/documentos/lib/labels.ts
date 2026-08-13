import type { DocumentOrigin, DocumentStatus } from "../types";

// Rótulos/tons de exibição — cálculo de apresentação fica fora do componente
// (CLAUDE.md: componente = JSX + binding). Espelha prazos/lib/labels.ts.

/** Selo de origem: o que dá (ou não) peso probatório ao documento. */
export function originLabel(origin: DocumentOrigin): string {
  return origin === "COURT" ? "dos autos" : "enviado";
}

type Tone = "neutral" | "info" | "success" | "danger";

/** Rótulo + tom do status da saga de ingestão, para o status-badge. */
export function statusLabel(status: DocumentStatus): {
  label: string;
  tone: Tone;
} {
  switch (status) {
    case "PENDING":
      return { label: "Aguardando envio", tone: "neutral" };
    case "UPLOADED":
      return { label: "Enviado", tone: "info" };
    case "EXTRACTING":
    case "EXTRACTED":
    case "CHUNKED":
      return { label: "Processando…", tone: "info" };
    case "READY":
      return { label: "Pronto", tone: "success" };
    case "FAILED":
      return { label: "Falhou", tone: "danger" };
  }
}

/** Tamanho legível (bytes → KB/MB). null/0 = "—". */
export function humanSize(bytes?: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
