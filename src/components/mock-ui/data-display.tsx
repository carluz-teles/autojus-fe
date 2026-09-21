import { cn, iniciais } from "@/lib/utils";

export function Avatar({
  nome,
  src,
  size = 22,
  destaque,
  className,
}: {
  nome: string;
  src?: string | null;
  size?: number;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-border text-muted-foreground grid shrink-0 place-items-center overflow-hidden rounded-full border",
        destaque &&
          "border-border text-primary bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      title={nome}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={nome} className="size-full object-cover" />
      ) : (
        iniciais(nome)
      )}
    </span>
  );
}
