// Rótulos e humanizações do processo (pt-BR) reunidos num só lugar — o cockpit e
// qualquer outra tela do processo consomem daqui (Regra nº1: uma fonte).

import type { ProcessoDegree, ProcessoSecrecy } from "../types";

export const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  UNKNOWN: "Grau não informado",
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado Especial",
  SUPERIOR: "Instância superior",
};

export const SECRECY_LABEL: Record<ProcessoSecrecy, string> = {
  PUBLIC: "Público",
  RESTRICTED: "Restrito",
  SECRET: "Sigiloso",
};

// Situação do processo (lifecycle) — texto livre do BE; mapa dos conhecidos +
// humanização de fallback para qualquer valor aparecer apresentável.
const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  ARCHIVED: "Arquivado",
  SUSPENDED: "Suspenso",
  CLOSED: "Encerrado",
  APPEAL: "Em recurso",
};

function humanize(raw: string): string {
  const spaced = raw.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function lifecycleLabel(raw: string): string {
  if (!raw) return "Situação não informada";
  return LIFECYCLE_LABEL[raw] ?? humanize(raw);
}

export function degreeLabel(degree: ProcessoDegree): string {
  return DEGREE_LABEL[degree] ?? degree;
}

export function secrecyLabel(secrecy: ProcessoSecrecy): string {
  return SECRECY_LABEL[secrecy] ?? secrecy;
}
