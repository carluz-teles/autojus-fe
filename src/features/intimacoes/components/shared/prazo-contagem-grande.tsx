"use client";

// PrazoContagemGrande — o número grande + as linhas de vencimento da tela de detalhe
// (/intimacoes/[id]). Extraído de intimacao-detail.tsx (Regra nº1), sem NENHUMA
// mudança visual — só movido de arquivo para ser importado também pelo painel lateral
// compacto do master-detail (que usa a MESMA lógica de urgência via prazoUrgenciaInfo,
// mas um layout menor — ver painel-lateral.tsx).

import { formatarData } from "@/lib/utils";

import type { IntimacaoPrazoView } from "../../types";
import { corTextoUrgencia, prazoUrgenciaInfo } from "./prazo-urgencia";

/** O número grande + as linhas de vencimento. Derivado do prazo real (days_left,
 * end_date, status). Sem prazo → estado honesto "Sem prazo".
 *
 * @param businessDaysSuffix - quando `true`, acrescenta " · dias úteis" à linha
 * "Fatal em {data}". Usado pelo painel lateral compacto do master-detail.
 * Default `false` (página full /intimacoes/[id] não passa a prop → sem sufixo,
 * sem regressão). */
export function PrazoContagemGrande({
  prazo,
  businessDaysSuffix = false,
}: {
  prazo: IntimacaoPrazoView | null;
  businessDaysSuffix?: boolean;
}) {
  const info = prazoUrgenciaInfo(prazo);
  if (!info || !prazo) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-display text-muted-foreground text-[52px] leading-none">
          —
        </span>
        <p className="text-muted-foreground text-[13px]">Sem prazo</p>
      </div>
    );
  }

  const { magnitude, atrasado, hoje } = info;
  const legenda = atrasado
    ? magnitude === 1
      ? "dia em atraso"
      : "dias em atraso"
    : hoje
      ? "vence hoje"
      : magnitude === 1
        ? "dia restante"
        : "dias restantes";

  return (
    <div className="flex items-center gap-3">
      <span
        className="font-display text-[52px] leading-none tabular-nums"
        style={{ color: corTextoUrgencia(prazo) }}
      >
        {hoje ? "0" : magnitude}
      </span>
      <div className="text-[13px] leading-snug">
        <p className="text-foreground font-medium">{legenda}</p>
        <p className="text-muted-foreground mt-0.5">
          Fatal em{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatarData(prazo.end_date)}
          </span>
          {businessDaysSuffix ? " · dias úteis" : null}
        </p>
      </div>
    </div>
  );
}
