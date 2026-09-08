"use client";

import { createContext, useContext, useId, useState } from "react";

import { cn } from "@/lib/utils";

import { tabListClassName, tabTriggerClassName } from "./tab-styles";

// Abas do design system: indicador verde, navegação por teclado e painéis associados.

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
  value: controlledValue,
  onValueChange,
  children,
  className,
}: {
  defaultValue: string;
  /** Controlled value — quando ausente, usa state interno (backward-compatible). */
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const baseId = useId();

  // Controlled quando `value` é fornecido; senão, fallback para o state interno.
  const value = controlledValue ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;

  return (
    <Ctx.Provider value={{ value, setValue, baseId }}>
      <div className={cn("min-w-0", className)}>{children}</div>
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
      className={tabListClassName}
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
      className={tabTriggerClassName(selected)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
  keepMounted = false,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  keepMounted?: boolean;
}) {
  const ctx = useTabsCtx("TabsContent");
  const selected = ctx.value === value;
  if (!selected && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      hidden={!selected}
      data-active={selected}
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("outline-none", className)}
    >
      {children}
    </div>
  );
}
