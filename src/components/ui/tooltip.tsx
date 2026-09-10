"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

// Tooltip do DS sobre o base-ui (mesmo padrão do Sheet/Dialog): dispara por
// hover/foco, posiciona no topo e desliza com os data-attrs transitórios. Fica
// em "Ledger" — texto pequeno sobre bg invertido (popover), borda sutil.
// Uso: <Tooltip label="…">…trigger…</Tooltip>.

export function Tooltip({
  label,
  children,
  className,
  render,
  side = "top",
  disabled = false,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  render?: TooltipPrimitive.Trigger.Props["render"];
  side?: TooltipPrimitive.Positioner.Props["side"];
  disabled?: boolean;
}) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  return (
    <TooltipPrimitive.Root onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger
        render={render ?? <span className="block w-full min-w-0" />}
        disabled={disabled}
        aria-describedby={open ? descriptionId : undefined}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align="center" sideOffset={6}>
          <TooltipPrimitive.Popup
            id={descriptionId}
            role="tooltip"
            data-slot="tooltip-content"
            className={cn(
              "bg-popover text-popover-foreground shadow-float z-50 max-w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border px-3 py-2 text-xs leading-snug",
              "transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
              className,
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
