"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { nomeExibicao } from "../lib/labels";
import { Responsavel } from "./responsavel";

const ITEM_CLASS =
  "focus:bg-accent data-highlighted:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-disabled:opacity-50";

export function ResponsavelMenu({
  value,
  nome,
  membros,
  emVoo,
  onAssign,
  label = "Responsável",
}: {
  value: string | null | undefined;
  nome?: string | null;
  membros: { id: string; name: string; email: string }[];
  emVoo: boolean;
  onAssign: (id: string | null) => void;
  label?: string;
}) {
  const atual = value
    ? nome?.trim() || "Responsável atribuído"
    : "Sem responsável";
  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={emVoo}
        aria-label={`${label}: ${atual}`}
        aria-busy={emVoo}
        className="hover:bg-muted focus-visible:ring-ring flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-60"
      >
        <Responsavel value={value} nome={nome} />
        {emVoo ? (
          <Loader2
            aria-hidden="true"
            className="text-fg3 size-3.5 shrink-0 animate-spin"
          />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="text-fg3 size-3.5 shrink-0"
          />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup className="bg-popover text-popover-foreground ring-foreground/10 max-h-[min(18rem,var(--available-height))] w-64 max-w-[var(--available-width)] overflow-y-auto rounded-lg p-1 shadow-md ring-1 outline-none">
            <Menu.RadioGroup
              value={value ?? ""}
              onValueChange={(v) => {
                const next = typeof v === "string" && v ? v : null;
                if (next !== (value || null)) onAssign(next);
              }}
            >
              <Menu.RadioItem value="" className={ITEM_CLASS}>
                <Responsavel />
                <Menu.RadioItemIndicator className="ml-auto">
                  <Check className="size-4" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
              {value && !membros.some((m) => m.id === value) && (
                <Menu.RadioItem value={value} disabled className={ITEM_CLASS}>
                  <Responsavel value={value} nome={nome} />
                  <Menu.RadioItemIndicator className="ml-auto">
                    <Check className="size-4" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              )}
              {membros.map((m) => (
                <Menu.RadioItem key={m.id} value={m.id} className={ITEM_CLASS}>
                  <Responsavel
                    value={m.id}
                    nome={nomeExibicao(m.name, m.email)}
                  />
                  <Menu.RadioItemIndicator className="ml-auto">
                    <Check className="size-4" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
