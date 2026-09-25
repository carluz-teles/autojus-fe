import { formatarData } from "@/lib/utils";

import { feriadosVigentes } from "../../lib/detalhe-apresentacao";
import type { PrazoDetalheView } from "../../types";

/** Explains only the verified current snapshot; birth memory is historical. */
export function ExplicacaoPrazo({
  prazo: p,
}: {
  prazo: PrazoDetalheView;
  estado: string;
}) {
  if (p.status === "NO_DEADLINE") return null;
  const calc =
    p.calculation_audit_status === "current" ? p.current_calculation : null;
  const holidays = feriadosVigentes(p);
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
                detail: calc.anchor_event || "Marco não registrado",
              },
              {
                label: "Contagem",
                value: `${calc.days} dias ${calc.counting === "BUSINESS" ? "úteis" : "corridos"}`,
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
