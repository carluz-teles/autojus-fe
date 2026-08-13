"use client";

import { ChevronDown, ListFilter } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import type { RowActionItem } from "@/components/ui/row-actions";
import { cn } from "@/lib/utils";

// Barra de topo das telas de LISTA: busca (via ListSearchToolbar) à esquerda,
// botão "Filtros" + dropdown "Ações" à direita. Normaliza o ListSearchToolbar —
// não o substitui (as telas que só querem busca seguem usando o primitivo).

/**
 * Toolbar de lista. `search`/`onSearchChange` controlam a busca (debounce e
 * request vivem no hook). `onFilters` liga o botão "Filtros" (badge mostra
 * quantos ativos). `actions` popula o dropdown "Ações" à direita. `filterSlot`
 * injeta chips/selects extras ao lado da busca.
 */
export function FilterToolbar({
  search,
  onSearchChange,
  placeholder,
  onFilters,
  activeFilters = 0,
  actions,
  filterSlot,
  className,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  onFilters?: () => void;
  /** Contagem de filtros ativos — mostra um badge no botão "Filtros". */
  activeFilters?: number;
  actions?: RowActionItem[];
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

      <div className="flex items-center gap-2">
        {onFilters ? (
          <Button variant="outline" size="sm" onClick={onFilters}>
            <ListFilter />
            Filtros
            {activeFilters > 0 ? (
              <span className="bg-primary text-primary-foreground ml-1 flex size-4 items-center justify-center rounded-full text-[0.625rem] tabular-nums">
                {activeFilters}
              </span>
            ) : null}
          </Button>
        ) : null}
        {actions?.length ? <ActionsMenu actions={actions} /> : null}
      </div>
    </div>
  );
}

// Dropdown "Ações" — mesmo molde headless do UserMenu (fecha fora/Esc).
function ActionsMenu({ actions }: { actions: RowActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Ações
        <ChevronDown />
      </Button>
      {open ? (
        <div
          role="menu"
          className="bg-popover text-popover-foreground absolute top-full right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border py-1 shadow-md"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={() => {
                  a.onSelect?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                  a.destructive
                    ? "text-destructive hover:bg-destructive/10"
                    : "hover:bg-accent",
                )}
              >
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                {a.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
