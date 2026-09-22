"use client";

// Dropdown minimalista (Popover-lite) do menu de responsável da linha densa —
// extraído do mockup dev/triagem-v2, sem dependência de estado de domínio. As abas
// da Triagem agora usam os componentes do DS (Tabs/FilterTabs), não este arquivo.

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function MenuDropdown({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {/* Wrapper de clique NÃO é <button> (o trigger já costuma ser um Button/pill
          clicável) — evita botão aninhado (HTML inválido). */}
      <span
        className="contents"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          className={cn(
            "border-border bg-card animate-in fade-in zoom-in-95 absolute top-full z-40 mt-1 min-w-44 overflow-hidden rounded-lg border p-1 shadow-lg duration-100",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      role="menuitem"
      className={cn(
        "hover:bg-muted flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}
