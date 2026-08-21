"use client";

import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { cn } from "@/lib/utils";

// Barra de topo das telas de LISTA: busca (via ListSearchToolbar) à esquerda e
// botão "Filtros" (só ícone + badge) à direita. Os filtros avançados moram no
// drawer da tela — o botão aqui só abre (via `onFilters`) e mostra quantos
// filtros estão ativos.

/**
 * Toolbar de lista. `search`/`onSearchChange` controlam a busca (debounce e
 * request vivem no hook). `onFilters` abre o drawer de filtros da tela (badge
 * mostra quantos ativos). `filterSlot` injeta chips/selects extras ao lado da
 * busca.
 */
export function FilterToolbar({
  search,
  onSearchChange,
  placeholder,
  onFilters,
  activeFilters = 0,
  filterSlot,
  className,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  onFilters?: () => void;
  /** Contagem de filtros ativos — mostra um badge no botão "Filtros". */
  activeFilters?: number;
  filterSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <ListSearchToolbar
        value={search}
        onChange={onSearchChange}
        placeholder={placeholder}
        className="flex-1"
      >
        {filterSlot}
      </ListSearchToolbar>

      {onFilters ? (
        <Button
          variant="outline"
          onClick={onFilters}
          aria-label="Filtros"
          title="Filtros"
          className="relative"
        >
          <ListFilter data-icon="inline-start" />
          Filtros
          {activeFilters > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[0.625rem] tabular-nums">
              {activeFilters}
            </span>
          ) : null}
        </Button>
      ) : null}
    </div>
  );
}
