"use client";

import { FilterX, type LucideIcon, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { FacetedFilter } from "@/components/ui/faceted-filter";
import { IconAction } from "@/components/ui/icon-action";

interface Filter {
  key: string;
  label: string;
  /** Ícone da categoria (repassado ao FacetedFilter). */
  icon?: LucideIcon;
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
      className="border-line bg-card/60 -mt-px flex shrink-0 flex-wrap items-center gap-2 border-y px-3 py-2.5 sm:px-4"
    >
      <ToolbarSearch
        search={search}
        onSearch={onSearch}
        searchLabel={searchLabel}
        placeholder={placeholder}
      />
      {filters.length > 0 && (
        <FacetedFilter
          label="Filtrar"
          facets={filters}
          values={Object.fromEntries(filters.map((f) => [f.key, f.value]))}
          onChange={(key, value) =>
            filters.find((f) => f.key === key)?.onChange(value)
          }
          onClear={onClear}
          className="h-9"
        />
      )}
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
              className="border-line bg-panel text-fg2 hover:bg-hover focus-visible:ring-ring/50 inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border pr-2 pl-2.5 text-[12px] outline-none focus-visible:ring-2 [@media(pointer:coarse)]:min-h-11"
            >
              <span className="truncate">{f.label}</span>
              <X aria-hidden="true" className="text-fg3 size-3 shrink-0" />
            </button>
          ))}
          <IconAction
            icon={FilterX}
            label="Limpar todos os filtros"
            onClick={onClear}
          />
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

/** Campo de busca canônico (pílula 280px, borda + foco). Fonte única — usado
 *  pelo ListToolbar e por buscas isoladas fora de uma toolbar (ex.: abas de
 *  configuração), para o input de busca ficar idêntico em todo o app. */
export function ToolbarSearch({
  search,
  onSearch,
  searchLabel,
  placeholder,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  placeholder: string;
}) {
  return (
    <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring/20 flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border px-3 shadow-xs focus-within:ring-3 sm:w-[280px] [@media(pointer:coarse)]:h-11">
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
  );
}
