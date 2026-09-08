import { cn } from "@/lib/utils";

/** Mesmo indicador verde das abas de filtros das listagens. */
export function tabTriggerClassName(active: boolean) {
  return cn(
    "focus-visible:ring-ring inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2.5 text-[12px] leading-none whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset",
    active
      ? "border-primary text-foreground font-medium"
      : "text-fg3 hover:bg-hover border-transparent",
  );
}

export const tabListClassName =
  "border-line flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b";
