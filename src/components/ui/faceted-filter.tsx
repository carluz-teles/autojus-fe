"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight, ListFilter, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Filtro facetado no padrão do design (Claude Design): botão "Filtros" abre um
// popover com um campo "Filtrar…" no topo + uma categoria por faceta (ícone +
// label + chevron →); cada categoria tem um submenu com as opções (radio).
// Ligado a um estado externo `values` (Record<facetKey, valor|"">).

export interface FacetOption {
  value: string;
  label: string;
}

export interface Facet {
  key: string;
  label: string;
  /** Ícone da categoria (à esquerda do label), como no design. */
  icon?: LucideIcon;
  options: FacetOption[];
}

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 min-w-56 origin-(--transform-origin) rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export function FacetedFilter({
  facets,
  values,
  onChange,
  onClear,
  label = "Filtros",
  iconOnly = false,
  className,
}: {
  facets: Facet[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  label?: string;
  /** Só o ícone (sem o texto "Filtros"). */
  iconOnly?: boolean;
  className?: string;
}) {
  // Busca das CATEGORIAS (o "Filtrar…" do topo do popover), não das opções.
  const [busca, setBusca] = useState("");
  const ativos = facets.filter((f) => values[f.key]);
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? facets.filter((f) => f.label.toLowerCase().includes(termo))
    : facets;

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (!open) setBusca("");
      }}
    >
      <Menu.Trigger
        render={
          <Button
            variant="outline"
            size={iconOnly ? "icon" : "sm"}
            aria-label={iconOnly ? label : undefined}
            className={cn("relative", className)}
          />
        }
      >
        <ListFilter data-icon={iconOnly ? undefined : "inline-start"} />
        {iconOnly ? null : label}
        {ativos.length > 0 ? (
          <span className="bg-primary text-primary-foreground grid size-4.5 place-items-center rounded-full text-[10px] tabular-nums">
            {ativos.length}
          </span>
        ) : null}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup className={POPUP_CLASS}>
            {/* "Filtrar…" — filtra a lista de categorias (como no design) */}
            <div className="border-border mb-1 border-b px-2 pt-0.5 pb-1.5">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Filtrar…"
                aria-label="Filtrar categorias"
                className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-[13px] outline-none"
              />
            </div>

            {visiveis.map((f) => {
              const valorAtual = values[f.key] ?? "";
              const rotuloAtual = f.options.find(
                (o) => o.value === valorAtual,
              )?.label;
              const Icone = f.icon;
              return (
                <Menu.SubmenuRoot key={f.key}>
                  <Menu.SubmenuTrigger className={ITEM_CLASS}>
                    {Icone ? <Icone className="text-muted-foreground" /> : null}
                    <span className="flex-1 truncate">{f.label}</span>
                    {rotuloAtual ? (
                      <span className="text-primary max-w-28 truncate text-xs">
                        {rotuloAtual}
                      </span>
                    ) : null}
                    <ChevronRight className="text-muted-foreground" />
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner
                      side="inline-end"
                      align="start"
                      sideOffset={2}
                      className="z-50"
                    >
                      <Menu.Popup
                        className={cn(
                          POPUP_CLASS,
                          "max-h-72 min-w-48 overflow-y-auto",
                        )}
                      >
                        <Menu.RadioGroup
                          value={valorAtual}
                          onValueChange={(v) =>
                            onChange(f.key, typeof v === "string" ? v : "")
                          }
                        >
                          <Menu.RadioItem value="" className={ITEM_CLASS}>
                            <span className="flex-1 truncate">Todos</span>
                            <Menu.RadioItemIndicator className="ml-auto">
                              <Check />
                            </Menu.RadioItemIndicator>
                          </Menu.RadioItem>
                          {f.options.map((o) => (
                            <Menu.RadioItem
                              key={o.value}
                              value={o.value}
                              className={ITEM_CLASS}
                            >
                              <span className="flex-1 truncate">{o.label}</span>
                              <Menu.RadioItemIndicator className="ml-auto">
                                <Check />
                              </Menu.RadioItemIndicator>
                            </Menu.RadioItem>
                          ))}
                        </Menu.RadioGroup>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              );
            })}

            {visiveis.length === 0 ? (
              <p className="text-muted-foreground px-2 py-1.5 text-[13px]">
                Nada encontrado.
              </p>
            ) : null}

            {ativos.length > 0 ? (
              <>
                <Menu.Separator className="bg-border -mx-1 my-1 h-px" />
                <Menu.Item className={ITEM_CLASS} onClick={onClear}>
                  <span className="text-muted-foreground">Limpar filtros</span>
                </Menu.Item>
              </>
            ) : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
