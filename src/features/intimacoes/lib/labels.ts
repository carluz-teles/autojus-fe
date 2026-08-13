// Humanizações da triagem da intimação (user_status) e derivação do prazo, num
// só lugar — a lista consome daqui; nada de cálculo no JSX (Regra nº1).

import type { IntimacaoUserStatus } from "../types";

// Situação de triagem (inbox) → rótulo pt-BR. Casa com os helpers de tom do DS
// (intimacaoTone) que resolvem a cor a partir do rótulo.
export const USER_STATUS_LABEL: Record<IntimacaoUserStatus, string> = {
  PENDING: "Pendente",
  RESOLVED: "Resolvida",
  IGNORED: "Ignorada",
};

export function userStatusLabel(status: IntimacaoUserStatus): string {
  return USER_STATUS_LABEL[status] ?? status;
}

const dayFormatter = new Intl.NumberFormat("pt-BR");
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Dias restantes até o início do prazo (deadline_start_at), do "hoje" ao alvo.
 * Retorna null quando a data é ausente/inválida. Positivo = futuro; 0 = hoje;
 * negativo = passado.
 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((end - start) / DAY_MS);
}

/** Texto humano dos dias restantes — "faltam N dias", "hoje", "há N dias". */
export function daysLeftLabel(iso: string | null | undefined): string | null {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (days === 0) return "hoje";
  const abs = dayFormatter.format(Math.abs(days));
  const unit = Math.abs(days) === 1 ? "dia" : "dias";
  return days > 0 ? `faltam ${abs} ${unit}` : `há ${abs} ${unit}`;
}
