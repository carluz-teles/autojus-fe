"use client";

import { StatusBadge } from "@/components/mock-ui/status-badge";
import { Switch } from "@/components/ui/switch";

export interface TermoCardDiario {
  nome: string;
  fontes: string[];
}

/**
 * Card de OAB monitorada — aba Configurações › Termos: header (nome/OAB, badge
 * "sem certificado", switch liga/desliga) + uma linha por diário (nome + fontes).
 * `titular` é o nome do advogado derivado de party_counsel; quando vazio/undefined
 * o header exibe somente a OAB, sem o "— " duplicado.
 * O switch reflete `enabled` (PATCH /v1/acquisition/watched-oabs/:oab) — não há
 * mais ação de remover, só ligar/desligar a captura.
 */
export function TermoCard({
  titular,
  oab,
  temCertificado,
  diarios,
  enabled,
  onToggleEnabled,
  toggleDisabled = false,
}: {
  titular?: string;
  oab: string;
  temCertificado: boolean;
  diarios: TermoCardDiario[];
  enabled: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
  toggleDisabled?: boolean;
}) {
  return (
    <article className="ring-hairline bg-card rounded-xl p-4.5">
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
        <Switch
          className="ml-auto"
          checked={enabled}
          onCheckedChange={onToggleEnabled}
          disabled={toggleDisabled || !onToggleEnabled}
          aria-label={
            enabled ? "Desativar monitoramento" : "Ativar monitoramento"
          }
        />
      </header>

      <div className="mt-3">
        {diarios.map((d) => (
          <div
            key={d.nome}
            className="border-border flex items-center gap-3 border-t py-2.5"
          >
            <span className="flex-1 text-[13px]">{d.nome}</span>
            <span className="flex gap-1.5">
              {d.fontes.map((f) => (
                <span
                  key={f}
                  className="border-border text-muted-foreground rounded-full border px-2 py-px text-[10.5px]"
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
