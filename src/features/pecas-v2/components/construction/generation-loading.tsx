import { Check, FileText, ShieldCheck } from "lucide-react";

// 4-phase loader — driven by REAL signals only (no timers).
//
// Phase 1 — Consultando teses     ← theses-stream: progress{count} / thesis / done
// Phase 2 — Reunindo o contexto   ← generation-stream stage: loading_context
// Phase 3 — Consultando os autos  ← generation-stream stage: analyzing_sources
// Phase 4 — Redigindo a minuta    ← generation-stream stage: drafting_sections
//            (first chunk → opens sheet; in-sheet label: Conferindo)
//
// auditing_draft    → in-sheet "Conferindo" (phase ≥ 4, handled by GerandoCenter)
// safe_fallback     → maps to phase 4 (defensive)
// retrieving_sources was removed — BE never emits it.
//
// Missing/slow signals keep the last real phase active (spinner).
// Phases only advance on real signals; never fabricated.

export type GenerationPhase = 1 | 2 | 3 | 4;

/** Maps a generation-stream `stage` string to a phase number (2-4). */
export const STAGE_PHASE: Record<string, GenerationPhase> = {
  loading_context: 2,
  analyzing_sources: 3,
  drafting_sections: 4,
  safe_fallback: 4,
  // auditing_draft is in-sheet: GerandoCenter handles it; no phase change here.
};

interface StepDef {
  label: string;
  sub: string;
}

// A etapa 3 tem DUAS redações porque a promessa tem que casar com o que existe:
// processo sem autos carregados (o gate acabou de avisar) não tem peça nem prova
// a consultar, e prometer "os autos do processo" ali é falso. A etapa continua
// existindo — ela espelha o stage REAL `analyzing_sources`, que o BE emite de
// todo jeito (o teor da publicação e os anexos manuais são as fontes) — mas
// nomeia o que de fato está sendo lido.
const STEPS_COM_AUTOS: StepDef[] = [
  { label: "Consultando teses", sub: "Fundamentos recomendados para o caso" },
  {
    label: "Reunindo o contexto",
    sub: "Partes, pedidos e andamento do processo",
  },
  {
    label: "Consultando os autos",
    sub: "Localizando peças e provas do processo",
  },
  {
    label: "Redigindo a minuta",
    sub: "Ao começar, a folha abre e você acompanha",
  },
];

const STEPS_SEM_AUTOS: StepDef[] = [
  STEPS_COM_AUTOS[0],
  STEPS_COM_AUTOS[1],
  {
    label: "Conferindo as fontes",
    sub: "Teor da publicação e anexos disponíveis",
  },
  STEPS_COM_AUTOS[3],
];

// Spinner ring — matches design: teal ring on grey circle
function SpinnerRing() {
  return (
    <span
      aria-hidden
      className="border-primary/25 border-t-primary size-4 animate-spin rounded-full border-2"
    />
  );
}

export function GenerationLoading({
  phase,
  thesesCount,
  connectionError,
  hasAutos = true,
}: {
  /** Current phase (1-4). Missing/waiting = 1 shown as active. */
  phase: GenerationPhase;
  /** Live count from theses-stream `progress` event (shown in phase 1). */
  thesesCount?: number;
  connectionError: boolean;
  /**
   * Processo tem autos carregados (`draft.processDocuments`). Quando FALSO, a
   * tela para de prometer autos que não existem — o gate da peça já avisou
   * "Processo sem autos carregados" e a etapa 3 se contradizia com ele.
   */
  hasAutos?: boolean;
}) {
  const steps = hasAutos ? STEPS_COM_AUTOS : STEPS_SEM_AUTOS;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      {/* Halo icon */}
      <div className="bg-primary/5 border-primary/20 text-primary relative grid size-20 place-items-center rounded-full border">
        <FileText className="size-8" aria-hidden />
        <span
          aria-hidden
          className="border-primary/30 border-t-primary absolute inset-[-1px] animate-spin rounded-full border-2 opacity-70"
          style={{ animationDuration: "1.1s" }}
        />
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-4">
        <p className="text-primary text-xs font-medium tracking-widest uppercase">
          Gerando a peça
        </p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Preparando a sua peça.
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {hasAutos
            ? "Reunimos as teses e os autos do processo."
            : "Reunimos as teses e o contexto do processo."}{" "}
          Assim que a redação começa, a folha abre para você acompanhar em tempo
          real.
        </p>
      </div>

      {/* 4-step progress */}
      <ol
        className="border-line bg-panel flex flex-col gap-[2px] rounded-xl border p-1.5"
        aria-label="Etapas do processamento"
      >
        {steps.map((step, index) => {
          const stepPhase = (index + 1) as GenerationPhase;
          const isDone = phase > stepPhase;
          const isActive = phase === stepPhase;
          return (
            <li
              key={step.label}
              data-state={isDone ? "done" : isActive ? "active" : "pending"}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center gap-3 rounded-[10px] px-3.5 py-3.5 transition-colors duration-300 data-[state=active]:bg-[color-mix(in_oklch,var(--primary)_5%,transparent)]"
            >
              {/* Dot */}
              <span
                aria-hidden
                className="data-[state=done]:bg-primary flex size-[22px] shrink-0 items-center justify-center rounded-full data-[state=done]:text-white data-[state=pending]:border"
                data-state={isDone ? "done" : isActive ? "active" : "pending"}
              >
                {isDone ? (
                  <Check className="size-3" strokeWidth={2.5} />
                ) : isActive ? (
                  <SpinnerRing />
                ) : null}
              </span>

              {/* Text */}
              <span className="flex flex-col gap-0.5">
                <span
                  className="data-[state=pending]:text-muted-foreground text-sm font-medium"
                  data-state={isDone ? "done" : isActive ? "active" : "pending"}
                >
                  {step.label}
                </span>
                <span className="text-muted-foreground text-xs">
                  {step.sub}
                </span>
              </span>

              {/* Live count (phase 1 only) */}
              {stepPhase === 1 && (
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-primary ml-auto font-mono text-xs opacity-0 data-[visible=true]:opacity-100"
                  data-visible={isActive || isDone ? "true" : "false"}
                >
                  {isDone && thesesCount != null && thesesCount > 0
                    ? `${thesesCount} encontradas`
                    : isActive
                      ? thesesCount != null && thesesCount > 0
                        ? `${thesesCount} encontradas`
                        : "buscando…"
                      : ""}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Disclaimer */}
      <div className="text-muted-foreground flex items-start gap-2 border-t pt-5 text-xs">
        <ShieldCheck
          aria-hidden
          className="text-gold mt-0.5 size-3.5 shrink-0"
        />
        <span>
          {connectionError
            ? "Acompanhamento temporariamente indisponível. A geração pode continuar; verificaremos o resultado automaticamente."
            : "Etapas informadas pelo processamento real. Ao começar a redação, a folha abre e o texto flui em tempo real — depois é só revisar e remover teses que não couberem. Nada será assinado ou protocolado."}
        </span>
      </div>
    </div>
  );
}
