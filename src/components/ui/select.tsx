import { ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select nativo estilizado — controle simples (ex.: itens-por-página). Nativo garante
 * teclado/acessibilidade de graça; o chevron é decorativo. Para menus ricos, preferir
 * um popover; aqui a simplicidade vence.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-flex">
      <select
        data-slot="select"
        className={cn(
          "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 h-9 w-full min-w-0 cursor-pointer appearance-none rounded-lg border py-1.5 pr-8 pl-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronsUpDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
    </div>
  );
}

export { Select };
