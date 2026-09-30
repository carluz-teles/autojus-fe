export const AUTOS_FETCH_RESULT_CODES = [
  "PROCESS_FOUND",
  "PROCESS_NOT_FOUND",
  "AUTHENTICATION_REQUIRED",
  "ACCESS_DENIED",
  "INVALID_PROCESS_DATA",
  "INTEGRATION_UNSUPPORTED",
  "PORTAL_UNAVAILABLE",
  "PORTAL_CHANGED",
  "RETRY_EXHAUSTED",
] as const;

export type AutosFetchResultCode = (typeof AUTOS_FETCH_RESULT_CODES)[number];

/**
 * Tradução única dos códigos persistidos/API para linguagem de produto.
 * O código continua estável para integrações; a interface exibe somente o rótulo.
 */
export const AUTOS_FETCH_RESULT_LABELS = {
  PROCESS_FOUND: "Processo localizado",
  PROCESS_NOT_FOUND: "Processo não localizado no tribunal",
  AUTHENTICATION_REQUIRED: "Acesso ao tribunal desconectado",
  ACCESS_DENIED: "Acesso aos autos negado",
  INVALID_PROCESS_DATA: "Dados do processo não aceitos",
  INTEGRATION_UNSUPPORTED: "Importação automática indisponível",
  PORTAL_UNAVAILABLE: "Tribunal indisponível",
  PORTAL_CHANGED: "Portal do tribunal não reconhecido",
  RETRY_EXHAUSTED: "Consulta interrompida",
} satisfies Record<AutosFetchResultCode, string>;

export function autosFetchResultLabel(code: AutosFetchResultCode): string {
  return AUTOS_FETCH_RESULT_LABELS[code];
}
