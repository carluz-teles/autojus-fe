"use client";

import { X } from "lucide-react";

import { StatusBadge } from "@/components/mock-ui/status-badge";

export interface TermoCardDiario {
  nome: string;
  fontes: string[];
}

/**
 * Card de OAB monitorada — aba Configurações › Termos: header (nome/OAB, badge
 * "sem certificado", remover) + uma linha por diário (nome + fontes).
 * `titular` é o nome do advogado derivado de party_counsel; quando vazio/undefined
 * o header exibe somente a OAB, sem o "— " duplicado.
 */
export function TermoCard({
  titular,
  oab,
  temCertificado,
  diarios,
  onRemover,
}: {
  titular?: string;
  oab: string;
  temCertificado: boolean;
  diarios: TermoCardDiario[];
  onRemover: () => void;
}) {
  return (
    <article className="ring-hairline rounded-xl bg-card p-4.5">
      <header className="flex flex-wrap items-center gap-3">
        <span className="text-[13.5px] font-medium">
          {titular ? (
            <>
              {titular} — <span className="tabular-nums">{oab}</span>
            </>
          ) : (
            <span className="tabular-nums">{oab}</span>
          )}
        </span>
        {!temCertificado && (
          <StatusBadge tone="warning" className="text-[10.5px] uppercase">
            sem certificado
          </StatusBadge>
        )}
        <button
          type="button"
          title="Remover inscrição"
          onClick={onRemover}
          className="ml-auto cursor-pointer text-muted-foreground hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <div className="mt-3">
        {diarios.map((d) => (
          <div
            key={d.nome}
            className="flex items-center gap-3 border-t border-border py-2.5"
          >
            <span className="flex-1 text-[13px]">{d.nome}</span>
            <span className="flex gap-1.5">
              {d.fontes.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-border px-2 py-px text-[10.5px] text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
