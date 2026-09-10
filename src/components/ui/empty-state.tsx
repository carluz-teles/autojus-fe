import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
        "bg-card/60 flex min-h-52 flex-col items-center justify-center gap-4 rounded-xl border px-5 py-10 text-center sm:px-6",
        className,
      )}
    >
      <span className="bg-primary/5 text-primary ring-primary/10 flex size-12 items-center justify-center rounded-2xl ring-1">
        <Icon aria-hidden className="size-5" strokeWidth={1.6} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-display text-foreground text-xl leading-snug">
          {title}
        </p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {phase ? <Badge variant="outline">{phase}</Badge> : null}
      {action}
    </div>
  );
}
