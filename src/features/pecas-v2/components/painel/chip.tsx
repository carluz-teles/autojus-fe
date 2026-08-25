"use client";

import { cn } from "@/lib/utils";

interface Props {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  /** Renderiza um chip com estado "loading" (spinner leve). */
  loading?: boolean;
}

export function Chip({
  active = false,
  disabled = false,
  onClick,
  children,
  loading = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
        (disabled || loading) && "cursor-not-allowed opacity-60",
      )}
    >
      {loading && (
        <span className="inline-block size-2 animate-pulse rounded-full bg-current" />
      )}
      {children}
    </button>
  );
}
