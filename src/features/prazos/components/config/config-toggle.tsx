"use client";

import type { ToggleVM } from "../../hooks/use-config";

// Switch on/off (trilho + knob) — port do template 1384/1415/1481. Como botão
// para as abas interativas (Integrações, Termos, Notificações).
export function ConfigToggle({ toggle }: { toggle: ToggleVM }) {
  return (
    <button
      onClick={toggle.onToggle}
      className="relative h-[18px] w-[34px] flex-none cursor-pointer rounded-full border-none"
      style={{ background: toggle.trilho }}
    >
      <span
        className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white [box-shadow:0_1px_2px_oklch(0.27_0.012_200/30%)] transition-transform duration-150"
        style={{ transform: toggle.knob }}
      />
    </button>
  );
}
