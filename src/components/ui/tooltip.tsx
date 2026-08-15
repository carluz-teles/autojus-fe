"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

// Tooltip do DS sobre o base-ui (mesmo padrão do Sheet/Dialog): dispara por
// hover/foco, posiciona no topo e desliza com os data-attrs transitórios. Fica
// em "Ledger" — texto pequeno sobre bg invertido (popover), borda sutil.
// Uso: <Tooltip label="…">…trigger…</Tooltip>.

export function Tooltip({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={<span className="block w-full min-w-0" />}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" align="center" sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              "bg-popover text-popover-foreground z-50 max-w-80 rounded-md border px-2.5 py-1.5 text-xs leading-snug shadow-md",
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
