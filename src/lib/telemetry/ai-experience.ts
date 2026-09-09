// Browser-only state is accessed lazily: this module is also imported by apiFetch
// on the server. Never store prompts, responses or credentials here.
export type ExperiencePhase =
  "first_content" | "complete" | "error" | "cancelled";
type Timing = {
  operationId: string;
  started: number;
  origin: number;
  phases: ExperiencePhase[];
};
type Send = (event: {
  operation_id: string;
  phase: ExperiencePhase;
  duration_ms: number;
}) => Promise<unknown>;
const prefix = "ai-experience:v1:";

export function isAIRequest(path: string, method: string): boolean {
  return (
    method === "POST" &&
    /^\/v1\/(?:pecas\/[^/]+\/(?:generate|generation-preparation|chat|iterate|review|theses)|intimacoes\/[^/]+\/(?:analise|theses)|processos\/[^/]+\/resumo)$/.test(
      path,
    )
  );
}

export function rememberAIRequest(
  path: string,
  operationId: string,
  started: number,
): void {
  if (typeof window === "undefined" || !/^[0-9a-f-]{36}$/i.test(operationId))
    return;
  try {
    // Bound storage and expire previous documents, preserving only correlation
    // within this tab. A reload must not invent a click-to-render duration.
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const existing = JSON.parse(
        sessionStorage.getItem(key) ?? "null",
      ) as Timing | null;
      if (
        !existing ||
        existing.origin !== performance.timeOrigin ||
        performance.now() - existing.started > 3_600_000
      )
        sessionStorage.removeItem(key);
    }
    if (sessionStorage.length > 200) return;
    sessionStorage.setItem(
      prefix + path,
      JSON.stringify({
        operationId,
        started,
        origin: performance.timeOrigin,
        phases: [],
      } satisfies Timing),
    );
  } catch {
    /* storage denied/full: never break generation */
  }
}

export function currentAIOperation(path: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const timing = JSON.parse(
      sessionStorage.getItem(prefix + path) ?? "null",
    ) as Timing | null;
    return timing?.origin === performance.timeOrigin
      ? timing.operationId
      : null;
  } catch {
    return null;
  }
}

export function recordAIExperience(
  path: string,
  phase: ExperiencePhase,
  send: Send,
  expectedOperationId?: string,
): void {
  if (typeof window === "undefined" || document.visibilityState !== "visible")
    return;
  try {
    const raw = sessionStorage.getItem(prefix + path);
    if (!raw) return;
    const timing = JSON.parse(raw) as Timing;
    if (
      (expectedOperationId !== undefined &&
        timing.operationId !== expectedOperationId) ||
      timing.origin !== performance.timeOrigin ||
      timing.phases.includes(phase)
    )
      return;
    const duration = performance.now() - timing.started;
    if (!Number.isFinite(duration) || duration < 0 || duration > 3_600_000)
      return;
    timing.phases.push(phase);
    sessionStorage.setItem(prefix + path, JSON.stringify(timing));
    void send({
      operation_id: timing.operationId,
      phase,
      duration_ms: duration,
    }).catch(() => {
      // No retry loop on the user's critical path. Backend also deduplicates.
    });
  } catch {
    /* malformed storage and telemetry faults are non-fatal */
  }
}
