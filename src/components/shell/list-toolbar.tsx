"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { FacetedFilter } from "@/components/ui/faceted-filter";

interface Filter {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

/** Busca e filtros no padrão Linear: faixa delimitada e seleções como chips. */
export function ListToolbar({
  search,
  onSearch,
  searchLabel,
  placeholder,
  filters,
  active,
  onClear,
  children,
  controls,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  placeholder: string;
  filters: Filter[];
  active: { key: string; label: string; remove: () => void }[];
  onClear: () => void;
  children?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div
      data-slot="list-toolbar"
      className="border-line -mt-px flex shrink-0 flex-wrap items-center gap-2 border-y px-4 py-2"
    >
      <div className="border-line bg-panel focus-within:ring-ring/50 flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 focus-within:ring-2 sm:w-[280px]">
        <Search aria-hidden="true" className="text-fg3 size-3.5 shrink-0" />
        <input
          aria-label={searchLabel}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="placeholder:text-fg3 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
        />
      </div>
      <FacetedFilter
        label="Filtrar"
        facets={filters}
        values={Object.fromEntries(filters.map((f) => [f.key, f.value]))}
        onChange={(key, value) =>
          filters.find((f) => f.key === key)?.onChange(value)
        }
        onClear={onClear}
        className="h-8 rounded-lg px-2.5 text-[12.5px]"
      />
      {controls}
      {active.length > 0 && (
        <div aria-label="Filtros ativos" className="contents">
          {active.map((f) => (
            <button
              type="button"
              key={f.key}
              onClick={f.remove}
              aria-label={`Remover filtro ${f.label}`}
              title={f.label}
              className="border-line bg-panel text-fg2 hover:bg-hover focus-visible:ring-ring/50 inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border pr-2 pl-2.5 text-[12px] outline-none focus-visible:ring-2"
            >
              <span className="truncate">{f.label}</span>
              <X aria-hidden="true" className="text-fg3 size-3 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="text-fg3 hover:text-fg2 focus-visible:ring-ring/50 h-8 rounded px-1 text-xs underline underline-offset-4 outline-none focus-visible:ring-2"
          >
            Limpar filtros
          </button>
        </div>
      )}
      {children && (
        <div className="ml-auto flex max-w-full flex-wrap items-center gap-2 [&_[data-slot=native-select]]:h-8 [&_[data-slot=native-select]]:text-[12px]">
          {children}
        </div>
      )}
    </div>
  );
}
