"use client";

import { StatusBadge } from "@/components/mock-ui/status-badge";
import { Switch } from "@/components/ui/switch";
import type { WatchedOabLastAction } from "@/features/integrations/types";

export interface TermoCardDiario {
  nome: string;
  fontes: string[];
}

const rotuloUltimaAcao: Record<WatchedOabLastAction, string> = {
  ADDED: "Adicionada",
  DISABLED: "Desativada",
  REENABLED: "Religada",
};

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Adicionada em 25/08, 14:32" — null quando não há last_action (linha anterior à coluna). */
function fmtUltimaAcao(
  lastAction: WatchedOabLastAction | null,
  lastActionAt: string | null,
): string | null {
  if (!lastAction) return null;
  const acao = rotuloUltimaAcao[lastAction];
  if (!lastActionAt) return acao;
  const d = new Date(lastActionAt);
  if (Number.isNaN(d.getTime())) return acao;
  return `${acao} em ${fmtDataHora.format(d)}`;
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
  lastAction = null,
  lastActionAt = null,
}: {
  titular?: string;
  oab: string;
  temCertificado: boolean;
  diarios: TermoCardDiario[];
  enabled: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
  toggleDisabled?: boolean;
  lastAction?: WatchedOabLastAction | null;
  lastActionAt?: string | null;
}) {
  const ultimaAcao = fmtUltimaAcao(lastAction, lastActionAt);

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
        {ultimaAcao && (
          <span className="text-muted-foreground text-[11.5px]">
            {ultimaAcao}
          </span>
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
