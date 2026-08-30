"use client";

import type { useConfig } from "../../hooks/use-config";

// Aba Equipe — port do template 1353-1367: header + "Convidar membro" +
// lista de membros (avatar iniciais, nome, OAB, papel colorido).
export function ConfigEquipe({ cfg }: { cfg: ReturnType<typeof useConfig> }) {
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
          onClick={cfg.convidar}
          className="bg-primary text-primary-foreground flex-none rounded-lg border-none px-3.5 py-2 text-[12.5px] font-medium"
        >
          Convidar membro
        </button>
      </div>
      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {cfg.equipe.map((m) => (
          <div
            key={m.nome}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
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
      </div>
    </>
  );
}
