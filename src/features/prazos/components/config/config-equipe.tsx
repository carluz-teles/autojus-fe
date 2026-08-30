"use client";

import { Mail } from "lucide-react";

import type { useConfig } from "../../hooks/use-config";
import { useInvite } from "../../hooks/use-invite";
import { InviteModal } from "./invite-modal";

// Aba Equipe — port de Atjus - Convite.dc.html (persona admin): header +
// "Convidar membro" (abre o modal) + lista de membros + convites pendentes.
export function ConfigEquipe({ cfg }: { cfg: ReturnType<typeof useConfig> }) {
  const inv = useInvite();

  return (
    <>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-[20px] font-medium">Equipe</div>
          <p className="text-fg3 mt-[3px] text-[12.5px]">
            Quem tem acesso e o papel de cada um.
          </p>
        </div>
        <button
          onClick={inv.abrir}
          className="bg-primary text-primary-foreground flex-none rounded-lg border-none px-3.5 py-2 text-[12.5px] font-medium"
        >
          Convidar membro
        </button>
      </div>
      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {cfg.equipe.map((m) => (
          <div
            key={m.nome}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3"
          >
            <span className="border-line text-fg2 grid size-[30px] flex-none place-items-center rounded-full border text-[11px]">
              {m.ini}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{m.nome}</span>
              <span className="text-fg3 block text-[11.5px]">{m.oab}</span>
            </span>
            <span
              className="text-[11.5px] font-medium"
              style={{ color: m.papelCor }}
            >
              {m.papel}
            </span>
          </div>
        ))}
        {inv.pendentes.map((p) => (
          <div
            key={p.email}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            style={{
              background: "color-mix(in oklch, var(--gold) 5%, transparent)",
            }}
          >
            <span className="border-line text-fg3 grid size-[30px] flex-none place-items-center rounded-full border border-dashed">
              <Mail className="size-3.5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px]">{p.email}</span>
              <span
                className="block text-[11.5px]"
                style={{ color: "var(--gold)" }}
              >
                convite pendente · {p.papel}
              </span>
            </span>
            <button
              onClick={p.reenviar}
              className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px]"
            >
              Reenviar
            </button>
          </div>
        ))}
      </div>

      <InviteModal inv={inv} />
    </>
  );
}
