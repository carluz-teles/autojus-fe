import { cn } from "@/lib/utils";

// Linha do tempo do DS — trilho vertical com marcadores. Composição pura
// (Timeline > TimelineItem): a feature passa o conteúdo de cada nó; o componente
// só desenha o trilho, o ponto e o alinhamento. Sem estado, sem lógica.

export function Timeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ol className={cn("relative flex flex-col", className)}>{children}</ol>
  );
}

export type TimelineTone = "default" | "gold" | "muted";

const DOT_TONE: Record<TimelineTone, string> = {
  default: "border-primary bg-card",
  gold: "border-gold bg-gold/20",
  muted: "border-border bg-card",
};

/**
 * Nó da linha do tempo. `last` remove o segmento de trilho abaixo do ponto.
 * `meta` é a coluna curta (data/hora) à esquerda do marcador em telas largas.
 */
export function TimelineItem({
  children,
  meta,
  tone = "default",
  last = false,
}: {
  children: React.ReactNode;
  meta?: React.ReactNode;
  tone?: TimelineTone;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-4 sm:gap-5">
      {meta ? (
        <div className="text-muted-foreground hidden w-28 shrink-0 pt-0.5 text-right text-xs tabular-nums sm:block">
          {meta}
        </div>
      ) : null}

      <div className="relative flex shrink-0 flex-col items-center">
        <span
          className={cn(
            "mt-1 size-3 shrink-0 rounded-full border-2",
            DOT_TONE[tone],
          )}
        />
        {!last ? <span className="bg-border w-px grow" aria-hidden /> : null}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        {meta ? (
          <div className="text-muted-foreground mb-1 text-xs tabular-nums sm:hidden">
            {meta}
          </div>
        ) : null}
        {children}
      </div>
    </li>
  );
}
