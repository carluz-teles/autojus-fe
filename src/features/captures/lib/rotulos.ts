import type { CaptureKind, CaptureSource } from "../types";

// Rótulos pt-BR da trilha de Capturas. Vivem AQUI, ao lado dos tipos do contrato,
// e não dentro do hook de tela: o `Record<CaptureKind, …>` transforma "esqueci de
// rotular um kind novo" em erro de compilação, do mesmo jeito que o BE pina a
// cobertura do enum por teste.

/** Rótulo pt-BR do tipo de captura. Conjunto fechado do BE: capture_run.kind
 *  (DAILY_CAPTURE | ENRICHMENT | MANUAL_IMPORT — migrations 0046/0155) mais os
 *  dois derivados na UNION do read model (INITIAL_LOAD do backfill_job e CATCH_UP
 *  do sync_run avulso — internal/acquisition/queries/captures.sql). */
export const KIND_LABEL: Record<CaptureKind, string> = {
  DAILY_CAPTURE: "Agendada",
  ENRICHMENT: "Enriquecimento",
  INITIAL_LOAD: "Carga inicial",
  CATCH_UP: "Religada",
  // O import manual de um CNJ (a "válvula de escape") deixa rastro como captura.
  MANUAL_IMPORT: "Importação manual",
};

// A FONTE diz O QUE a ingestão trouxe: DJEN descobre publicações/intimações por OAB;
// DATAJUD enriquece os processos (dados do tribunal). É a distinção que o usuário
// pediu ver — não o jargão de sistema.
export const SOURCE_LABEL: Record<CaptureSource, { rot: string; cor: string }> =
  {
    DJEN: { rot: "Publicações", cor: "var(--primary)" },
    DATAJUD: { rot: "Enriquecimento", cor: "var(--blue)" },
  };

/**
 * Rótulo do tipo de captura. O fallback devolve o valor cru DE PROPÓSITO (mesmo
 * padrão future-proof do BE, ex.: briefDemandLabel em internal/advisory): um kind
 * novo continua visível na trilha de auditoria em vez de virar linha em branco.
 * Não é desculpa pra não rotular — `KIND_LABEL` é `Record<CaptureKind, …>`, então
 * todo kind do contrato TEM rótulo, e o cru só aparece se o BE andar na frente.
 */
export function captureKindLabel(kind: string): string {
  return KIND_LABEL[kind as CaptureKind] ?? kind;
}

/**
 * Fonte + cor do badge. `integration.source` não tem CHECK no banco (só DJEN e
 * DATAJUD são produzidos hoje), então o fallback usa o código cru com a cor neutra
 * — aqui isso é aceitável porque o valor é a SIGLA da fonte, legível como está;
 * inventar um rótulo pt-BR pra uma fonte que não conhecemos seria pior.
 */
export function captureSourceLabel(source: string) {
  return (
    SOURCE_LABEL[source as CaptureSource] ?? {
      rot: source,
      cor: "var(--fg2)",
    }
  );
}
