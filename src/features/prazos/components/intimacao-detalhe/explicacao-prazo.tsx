import { formatarData } from "@/lib/utils";

import {
  dataEscolhidaNaApuracao,
  feriadosVigentes,
} from "../../lib/detalhe-apresentacao";
import type { PrazoDetalheView } from "../../types";

/** Presents recorded values only: no client-side deadline arithmetic or legal inference. */
export function ExplicacaoPrazo({
  prazo: p,
  estado,
}: {
  prazo: PrazoDetalheView;
  estado: string;
}) {
  if (p.status === "NO_DEADLINE") return null;
  const calc = p.calc_memory;
  const chosen = dataEscolhidaNaApuracao(p);
  const holidays = feriadosVigentes(p);
  const rule = p.confirmed
    ? p.legal_citation
    : p.origem === "declarado"
      ? "Publicação de origem"
      : calc?.prazo_base_fonte || p.legal_citation || calc?.tabela_legal_ref;
  const origin = chosen
    ? "O vencimento foi escolhido diretamente na apuração. Não resulta de uma nova contagem."
    : p.confirmed
      ? "Tipo e contagem revisados pelo advogado."
      : p.origem === "declarado"
        ? "A duração do prazo foi extraída da publicação."
        : p.origem === "ia"
          ? "A regra de prazo foi aplicada a um tipo de ato sugerido por IA."
          : p.origem === "calculado"
            ? "A duração vem da regra associada ao tipo de ato registrado."
            : p.origem === "divergente"
              ? "A duração informada na publicação diverge do cálculo por regra. Confira a apuração antes de confirmar."
              : "A origem da duração não foi detalhada neste registro.";
  return (
    <section
      aria-label="Explicação do prazo"
      className="flex flex-col gap-3 border-t pt-4"
    >
      <div>
        <h3 className="text-sm font-medium">Por que essa data?</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {origin}
        </p>
        {!chosen ? (
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {rule ? (
              <>
                <span className="text-foreground font-medium">
                  Fonte da duração:{" "}
                </span>
                {rule}
              </>
            ) : (
              "Fundamentação da duração não disponível neste registro."
            )}
          </p>
        ) : null}
      </div>
      {!chosen ? (
        <>
          <ol
            aria-label="Etapas do cálculo registrado"
            className="flex flex-col gap-3"
          >
            {[
              {
                label: "Marco inicial",
                value: p.start_date
                  ? formatarData(p.start_date)
                  : "Não informado",
                detail: p.confirmed
                  ? "Início registrado na revisão."
                  : calc?.termo_inicial_regra ||
                    "Regra de início não registrada.",
              },
              {
                label: "Contagem",
                value: p.days
                  ? `${p.days} dias ${p.counting === "BUSINESS" ? "úteis" : "corridos"}`
                  : "Duração não informada",
                detail: p.doubled
                  ? "Prazo em dobro registrado."
                  : "Sem prazo em dobro.",
              },
              {
                label: "Vencimento",
                value: p.end_date ? formatarData(p.end_date) : "Não informado",
                detail: p.confirmed
                  ? "Data registrada após revisão."
                  : "Data registrada, ainda sujeita à revisão quando exigida.",
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
            {p.manual_extra_days
              ? ` · ${p.manual_extra_days} dia(s) adicional(is)`
              : " · sem dias adicionais"}
            .
          </p>
        </>
      ) : null}
      <div className="text-muted-foreground flex flex-col gap-1 text-xs leading-relaxed">
        {!p.confirmed && estado === "ia" ? (
          <p>
            A justificativa específica da classificação do ato não foi
            registrada. Confira o teor da intimação.
          </p>
        ) : null}
        {!calc && !chosen ? (
          <p>
            Memória detalhada indisponível; exibindo apenas os dados
            registrados.
          </p>
        ) : null}
      </div>
    </section>
  );
}
