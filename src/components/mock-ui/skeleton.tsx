import { cn } from "@/lib/utils";

/**
 * Primitivo de loading do design system "Ledger" — bloco animate-pulse +
 * bg-muted, mesmo tom neutro já usado em todo o app (ex.: avatar placeholder
 * do UserMenu). Toda tela nova deve montar seu skeleton a partir deste bloco
 * (ou dos compostos abaixo) em vez de reinventar animate-pulse solto.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

/**
 * Linhas rótulo/valor (ex.: card "Dados do escritório") — replica a forma de
 * `[k, v].map(...)` com border-t, mesmo padding/altura do conteúdo real pra
 * não pular layout quando os dados chegam.
 */
export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-t border-border py-2.5 first:border-t-0"
        >
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}
