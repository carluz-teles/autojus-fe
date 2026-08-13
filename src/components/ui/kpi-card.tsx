import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// Tom do indicador — dirige a cor do ícone (no quadrado tênue) e do valor.
// Vocabulário semântico do DS (neutral|info|warning|danger|success) + aliases
// legados (default|gold|destructive|muted) que o cockpit já usa. Um só mapa:
//   gold≈warning · destructive≈danger · default/muted≈neutral.
export type KpiTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success"
  // Aliases retrocompatíveis (uso atual no cockpit).
  | "default"
  | "gold"
  | "destructive"
  | "muted";

// Ícone dentro de um quadrado de fundo tênue (bg tom-sobre-tom).
const ICON_BOX_TONE: Record<KpiTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warning: "bg-gold/12 text-gold",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  // aliases
  default: "bg-muted text-muted-foreground",
  gold: "bg-gold/12 text-gold",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground/60",
};

const VALUE_TONE: Record<KpiTone, string> = {
  neutral: "text-foreground",
  info: "text-sky-700 dark:text-sky-300",
  warning: "text-gold",
  danger: "text-destructive",
  success: "text-emerald-700 dark:text-emerald-400",
  // aliases
  default: "text-foreground",
  gold: "text-gold",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/**
 * Cartão de KPI/indicador do DS — ícone em quadrado de fundo tênue, rótulo
 * MAIÚSCULO pequeno, número grande em Fraunces (font-display), sublinha
 * opcional. Tom semântico pinta ícone + valor. Vira botão de filtro quando
 * `onClick` é passado, ou link quando `href` é passado. Só JSX + binding; a
 * derivação de valor/tom vive em hooks/helpers da feature.
 */
export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "neutral",
  href,
  onClick,
  active = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  icon: LucideIcon;
  tone?: KpiTone;
  href?: string;
  /** Torna o card clicável (vira filtro). Ignorado quando `href` é passado. */
  onClick?: () => void;
  /** Realça o card como filtro ativo (anel latão). */
  active?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            ICON_BOX_TONE[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "font-display mt-3 text-2xl leading-none tabular-nums",
          VALUE_TONE[tone],
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
          {sublabel}
        </p>
      ) : null}
    </>
  );

  const base =
    "bg-card ring-foreground/10 flex flex-col rounded-xl p-4 text-left shadow-sm ring-1";
  const interactive =
    "hover:ring-gold/40 focus-visible:ring-ring/50 transition-shadow outline-none focus-visible:ring-2";
  const activeRing = active ? "ring-gold/60 ring-2" : "";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, interactive, activeRing, className)}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(base, interactive, activeRing, className)}
      >
        {inner}
      </button>
    );
  }

  return <div className={cn(base, className)}>{inner}</div>;
}

/**
 * Faixa responsiva de KpiCards — grade fluida de 1 coluna (mobile) até 4–6
 * colunas em telas largas. `cols` fixa o teto de colunas quando a feature quer
 * controlar a densidade; o default acomoda 4–6 cards sem quebrar feio.
 */
export function KpiRow({
  children,
  cols = 6,
  className,
}: {
  children: React.ReactNode;
  cols?: 4 | 5 | 6;
  className?: string;
}) {
  const COLS: Record<4 | 5 | 6, string> = {
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };
  return (
    <div className={cn("grid grid-cols-1 gap-4", COLS[cols], className)}>
      {children}
    </div>
  );
}
