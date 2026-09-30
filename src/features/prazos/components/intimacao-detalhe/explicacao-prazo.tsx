import { formatarData } from "@/lib/utils";

import { feriadosVigentes } from "../../lib/detalhe-apresentacao";
import { contagemLabel, termoInicialLabel } from "../../lib/labels";
import type { PrazoDetalheView } from "../../types";

/** Explains only the verified current snapshot; birth memory is historical. */
export function ExplicacaoPrazo({
  prazo: p,
  declaredDeadlineDays = null,
}: {
  prazo: PrazoDetalheView;
  estado: string;
  /** brief_declared_deadline_days (P1-1) — a duração que o TEOR declara, um
   *  fato independente do cálculo do motor. Só é exibida quando DIVERGE da
   *  contagem vigente: quando coincide, "Contagem: N dias" já diz o mesmo e
   *  repetir seria ruído. null = sem brief / sem prazo declarado no teor. */
  declaredDeadlineDays?: number | null;
}) {
  if (p.status === "NO_DEADLINE") return null;
  const calc =
    p.calculation_audit_status === "current" ? p.current_calculation : null;
  const holidays = feriadosVigentes(p);
  // O prazo declarado no teor é um fato INDEPENDENTE do cálculo do motor, e
  // vale exibir em dois casos distintos — nunca no terceiro:
  //   1. sem memória corrente (`calc` null): é a ÚNICA duração conhecida da
  //      publicação, então informa (tom neutro);
  //   2. com memória que DIVERGE: são dois números conflitantes sobre a mesma
  //      coisa, e o advogado precisa decidir qual vale (tom de alerta);
  //   3. com memória que COINCIDE: "Contagem: N dias" já disse — repetir daria
  //      a impressão de duas fontes confirmando o mesmo, quando é um dado só.
  const declarado = declaredDeadlineDays;
  const declaradoDiverge =
    declarado !== null && !!calc && declarado !== calc.days;
  const declaradoSozinho = declarado !== null && !calc;
  return (
    <section
      aria-label="Explicação do prazo"
      className="flex flex-col gap-3 border-t pt-4"
    >
      <div>
        <h3 className="text-sm font-medium">Por que essa data?</h3>
        {!calc ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {p.calculation_audit_status === "historical"
              ? "A memória disponível é histórica e não explica o vencimento atual. Confira a publicação e o prazo registrado."
              : "A memória do cálculo atual não está disponível. Confira a publicação e o prazo registrado."}
          </p>
        ) : (
          <>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {calc.source === "declared"
                ? "A duração foi informada na publicação."
                : calc.source === "manual"
                  ? "O vencimento foi ajustado por uma decisão humana."
                  : calc.source === "generic_fallback"
                    ? "A regra genérica produziu uma data provisória; revise o tipo e o prazo."
                    : "A duração veio da regra associada ao tipo registrado."}
              {calc.protected
                ? " A data atual está protegida por uma decisão anterior."
                : ""}
            </p>
            {calc.reason ? (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {calc.reason}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              <span className="text-foreground font-medium">
                Fonte da duração:{" "}
              </span>
              {calc.legal_citation ||
                (calc.source === "declared"
                  ? "Publicação de origem"
                  : "Referência não registrada")}
            </p>
          </>
        )}
        {declaradoSozinho ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            O teor declara {declarado} dia(s) de prazo.
          </p>
        ) : null}
        {declaradoDiverge ? (
          <p
            role="note"
            className="text-gold-foreground mt-1 text-xs leading-relaxed"
          >
            O teor declara {declarado} dia(s) — diferente da contagem registrada
            ({calc?.days}). Confira o tipo e o prazo.
          </p>
        ) : null}
      </div>
      {calc ? (
        <>
          <ol
            aria-label="Etapas do cálculo registrado"
            className="flex flex-col gap-3"
          >
            {[
              {
                label: "Marco inicial",
                value: calc.start_date
                  ? formatarData(calc.start_date)
                  : "Não informado",
                detail: termoInicialLabel(calc.anchor_event),
              },
              {
                label: "Contagem",
                value: `${calc.days} dias ${contagemLabel(calc.counting)}`,
                detail: calc.doubled
                  ? "Prazo em dobro registrado."
                  : "Sem prazo em dobro.",
              },
              {
                label: "Vencimento",
                value: calc.end_date
                  ? formatarData(calc.end_date)
                  : "Não informado",
                detail: calc.protected
                  ? "Data preservada na revisão do tipo."
                  : "Data do cálculo atual.",
              },
            ].map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span
                  aria-hidden
                  className="text-primary bg-primary/10 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="text-muted-foreground">{step.label}</span>
                    <span className="ml-2 font-medium tabular-nums">
                      {step.value}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {holidays.length} feriado(s) ou suspensão(ões) registrado(s)
            {calc.manual_extra_days
              ? ` · ${calc.manual_extra_days} dia(s) adicional(is)`
              : " · sem dias adicionais"}
            .
          </p>
        </>
      ) : null}
    </section>
  );
}
