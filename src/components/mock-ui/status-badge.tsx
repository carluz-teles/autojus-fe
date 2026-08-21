import { cn } from "@/lib/utils";

export type Tom = "neutral" | "info" | "success" | "warning" | "danger";

const TONS: Record<Tom, { fundo: string; cor: string }> = {
  neutral: { fundo: "var(--muted)", cor: "var(--muted-foreground)" },
  info: {
    fundo: "color-mix(in oklch, var(--info) 12%, transparent)",
    cor: "var(--info)",
  },
  success: {
    fundo: "color-mix(in oklch, var(--success) 12%, transparent)",
    cor: "var(--success)",
  },
  warning: {
    fundo: "color-mix(in oklch, var(--gold) 14%, transparent)",
    cor: "var(--gold)",
  },
  danger: {
    fundo: "color-mix(in oklch, var(--destructive) 10%, transparent)",
    cor: "var(--destructive)",
  },
};

export const corDoTom = (tom: Tom) => TONS[tom].cor;

export function StatusBadge({
  tone = "neutral",
  ponto,
  className,
  children,
}: {
  tone?: Tom;
  ponto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { fundo, cor } = TONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium",
        className,
      )}
      style={{ background: fundo, color: cor }}
    >
      {ponto && (
        <span
          className="size-1.5 rounded-full"
          style={{ background: cor }}
        />
      )}
      {children}
    </span>
  );
}

export function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-lg bg-muted/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block max-w-full truncate rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-medium">
      {children}
    </span>
  );
}
