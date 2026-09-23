import { cn } from "@/lib/utils";

/** Mesmo indicador verde das abas de filtros das listagens. */
export function tabTriggerClassName(active: boolean) {
  // A borda inferior fica SEMPRE transparente (só reserva a altura) — o indicador
  // ativo agora é o sublinhado DESLIZANTE renderizado pelo TabsList (useSlidingIndicator).
  return cn(
    "focus-visible:ring-ring inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b-2 border-transparent px-2.5 text-[12px] leading-none whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset",
    active
      ? "text-foreground font-medium"
      : "text-muted-foreground hover:bg-hover hover:text-foreground",
  );
}

export const tabListClassName =
  "border-line flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b";
