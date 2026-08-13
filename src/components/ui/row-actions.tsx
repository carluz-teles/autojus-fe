"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// Menu kebab (⋮) de ações de linha — headless, no mesmo molde do UserMenu (sem
// dependência nova): fecha ao clicar fora ou apertar Esc. A coluna "AÇÃO" da
// DataTable usa isto. Cada item é um <RowAction>; a feature passa onClick/href.

export interface RowActionItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Pinta o item como destrutivo (ex.: arquivar/excluir). */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Botão kebab + popup de ações. `items` é a lista de ações da linha. Quando não
 * há itens, cai num botão placeholder desabilitado (útil enquanto a feature não
 * ligou as ações). Só JSX + binding: os handlers vêm da feature via `items`.
 */
export function RowActions({
  items,
  label = "Ações da linha",
  className,
}: {
  items?: RowActionItem[];
  label?: string;
  className?: string;
}) {
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

  const trigger = (
    <button
      type="button"
      onClick={() => items?.length && setOpen((v) => !v)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      disabled={!items?.length}
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-lg outline-none focus-visible:ring-2 disabled:opacity-40",
        open && "bg-muted text-foreground",
      )}
    >
      <MoreVertical className="size-4" />
    </button>
  );

  if (!items?.length) return trigger;

  return (
    <div className={cn("relative inline-flex", className)} ref={ref}>
      {trigger}
      {open ? (
        <div
          role="menu"
          className="bg-popover text-popover-foreground absolute top-full right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border py-1 shadow-md"
        >
          {items.map((item) => (
            <RowAction
              key={item.label}
              item={item}
              onDone={() => setOpen(false)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowAction({
  item,
  onDone,
}: {
  item: RowActionItem;
  onDone: () => void;
}) {
  const Icon = item.icon;
  const cls = cn(
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
    item.destructive
      ? "text-destructive hover:bg-destructive/10"
      : "hover:bg-accent",
  );
  const body = (
    <>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {item.label}
    </>
  );

  if (item.href) {
    return (
      <a role="menuitem" href={item.href} className={cls} onClick={onDone}>
        {body}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        item.onSelect?.();
        onDone();
      }}
      className={cls}
    >
      {body}
    </button>
  );
}
