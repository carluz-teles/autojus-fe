import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Estado vazio rico do DS — ícone + título + descrição, opcionalmente uma
// "pílula de fase" (quando o conteúdo chega numa fatia futura) e uma ação. Só
// JSX + binding; usado nas abas do cockpit e onde uma lista está vazia.
export function EmptyState({
  icon: Icon,
  title,
  description,
  phase,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Rótulo curto de fase — ex. "Chega na Fase 3". Destaca em latão. */
  phase?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <span className="bg-muted/60 text-muted-foreground flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-foreground/90 text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {phase ? (
        <span className="border-gold/40 bg-gold/[0.06] text-gold rounded-full border px-2.5 py-0.5 text-xs font-medium">
          {phase}
        </span>
      ) : null}
      {action}
    </div>
  );
}
