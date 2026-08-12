import { Search, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ListSearchToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Filtros ao lado da busca (chips, selects). Renderizados à direita. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Barra no topo da tabela: campo de busca à esquerda, slot de filtros à direita.
 * A busca é controlada (o debounce e a request vivem no hook da feature). Um botão de
 * limpar aparece quando há texto.
 */
export function ListSearchToolbar({
  value,
  onChange,
  placeholder = "Buscar…",
  children,
  className,
}: ListSearchToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 sm:flex-nowrap",
        className,
      )}
    >
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9 pl-9"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Limpar busca"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded outline-none focus-visible:ring-2"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
