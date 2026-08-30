"use client";

import type { useConfig } from "../../hooks/use-config";
import { ConfigToggle } from "./config-toggle";

// Aba Notificações — port do template 1474-1485: título/desc + linhas com toggle.
export function ConfigNotif({ cfg }: { cfg: ReturnType<typeof useConfig> }) {
  return (
    <>
      <div className="font-display mb-1 text-[20px] font-medium">
        {cfg.notif.titulo}
      </div>
      <p className="text-fg3 mt-0 mb-4 text-[12.5px]">{cfg.notif.desc}</p>
      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {cfg.notif.linhas.map((l) => (
          <div
            key={l.rot}
            className="border-line2 flex items-center gap-3.5 border-b px-4 py-[13px] last:border-b-0"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{l.rot}</span>
              <span className="text-fg3 mt-0.5 block text-[11.5px]">
                {l.val}
              </span>
            </span>
            <ConfigToggle toggle={l.toggle} />
          </div>
        ))}
      </div>
    </>
  );
}
