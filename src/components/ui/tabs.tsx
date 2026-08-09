"use client";

import { createContext, useContext, useId, useState } from "react";

import { cn } from "@/lib/utils";

// Tabs acessíveis feitas à mão (mesmo molde headless do NotificationBell/UserMenu:
// sem dependência nova). Estilo "segmented" de propósito — o SettingsNav acima já
// usa underline, então as abas internas usam pílulas para marcar outra hierarquia.
// Teclado: setas movem e selecionam (roving tabindex).

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const Ctx = createContext<TabsCtx | null>(null);

function useTabsCtx(component: string): TabsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error(`${component} precisa estar dentro de <Tabs>`);
  return ctx;
}

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const baseId = useId();
  return (
    <Ctx.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({
  children,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const tabs = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
        );
        const current = tabs.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (current === -1) return;
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(current + delta + tabs.length) % tabs.length];
        next.focus();
        next.click();
      }}
      className="bg-muted/60 inline-flex items-center gap-1 rounded-lg border p-1"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = useTabsCtx("TabsTrigger");
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "bg-card text-foreground border shadow-xs"
          : "text-muted-foreground hover:text-foreground border border-transparent",
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useTabsCtx("TabsContent");
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("reveal outline-none", className)}
    >
      {children}
    </div>
  );
}
