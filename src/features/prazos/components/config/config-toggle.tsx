"use client";

import type { ToggleVM } from "../../hooks/use-config";

// Switch on/off (trilho + knob) — port do template 1384/1415/1481. Como botão
// para as abas interativas (Integrações, Termos, Notificações).
export function ConfigToggle({
  toggle,
  label = "Alternar opção",
}: {
  toggle: ToggleVM;
  label?: string;
}) {
  return (
    <button
      onClick={toggle.onToggle}
      type="button"
      aria-label={label}
      aria-pressed={toggle.knob === "translateX(16px)"}
      className="relative grid size-[34px] flex-none cursor-pointer place-items-center rounded-full border-none bg-transparent p-0 pointer-coarse:size-11"
    >
      <span
        className="relative block h-[18px] w-[34px] rounded-full"
        style={{ background: toggle.trilho }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white [box-shadow:0_1px_2px_oklch(0.27_0.012_200/30%)] transition-transform duration-150"
          style={{ transform: toggle.knob }}
        />
      </span>
    </button>
  );
}
