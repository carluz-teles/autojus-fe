import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Checklist com barra de progresso (casca) — itens marcáveis com data e uma
// barra "X/Y concluídas". Recebe os itens via props; NÃO persiste nada (o toggle
// é responsabilidade da feature via `onToggle`). Só JSX + binding.

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Data de conclusão já formatada (ex.: "12/08/2026"). */
  date?: string;
}

/**
 * Lista de itens com check + barra de progresso no topo. `onToggle` liga o
 * toggle (opcional; sem ele os itens são só leitura). O total concluído é
 * derivado dos itens.
 */
export function ChecklistProgress({
  items,
  onToggle,
  className,
}: {
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
  className?: string;
}) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
          {done}/{total} concluídas
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Marker = (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                item.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {item.done ? <Check className="size-3.5" /> : null}
            </span>
          );

          const content = (
            <>
              {Marker}
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.done && "text-muted-foreground line-through",
                )}
              >
                {item.label}
              </span>
              {item.date ? (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.date}
                </span>
              ) : null}
            </>
          );

          return (
            <li key={item.id}>
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  aria-pressed={item.done}
                  className="hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-2"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-2 py-1.5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
