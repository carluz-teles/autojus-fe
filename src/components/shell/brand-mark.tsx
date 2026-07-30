import { cn } from "@/lib/utils";

/** Monograma da marca: quadrado tinta com "j" serifado e fio de latão. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display bg-primary text-primary-foreground ring-gold/40 inline-flex size-8 items-center justify-center rounded-md text-lg leading-none ring-1 select-none",
        className,
      )}
    >
      j
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-display text-[1.05rem] leading-none font-medium tracking-tight">
        jus<span className="text-gold">·</span>assessoria
      </span>
    </span>
  );
}
