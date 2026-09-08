import type { IntimacaoView } from "@/features/intimacoes/types";
import { daysLeftLabel } from "@/features/prazos/lib/labels";

export function intimacaoPendente(
  i: Pick<IntimacaoView, "status" | "user_status">,
) {
  return i.status === "ACTIVE" && i.user_status === "PENDING";
}

export function prazoPendente(p: {
  status: string;
  intimation_user_status?: string;
  intimation_status?: string;
}) {
  return (
    ["PENDING", "OPEN", "MISSED"].includes(p.status) &&
    !["RESOLVED", "IGNORED"].includes(p.intimation_user_status || "") &&
    p.intimation_status !== "CANCELLED"
  );
}

export function urgenciaPrazo(days: number) {
  return {
    label:
      days === 0
        ? "Vence hoje"
        : days < 0
          ? daysLeftLabel(days)
          : `${daysLeftLabel(days)} corridos restantes`,
    variant:
      days <= 0
        ? ("destructive" as const)
        : days <= 3
          ? ("warning" as const)
          : ("secondary" as const),
  };
}

/** Aceita reais com vírgula ou ponto decimal; rejeita entradas ambíguas/inválidas. */
export function parseValorCausa(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^(?:\d+(?:[.,]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(value))
    return NaN;
  const normalized =
    value.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(value)
      ? value.replaceAll(".", "").replace(",", ".")
      : value;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : NaN;
}
