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
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-border text-muted-foreground",
        destaque &&
          "border-border bg-[color-mix(in_oklch,var(--primary)_10%,transparent)] text-primary",
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

export function Kpi({
  rotulo,
  valor,
  tom = "neutral",
  dica,
  icone,
}: {
  rotulo: string;
  valor: string | number;
  tom?: "neutral" | "info" | "success" | "warning" | "danger";
  dica?: string;
  icone?: React.ReactNode;
}) {
  const cores = {
    neutral: ["var(--muted)", "var(--foreground)"],
    info: ["color-mix(in oklch, var(--info) 12%, transparent)", "var(--info)"],
    success: [
      "color-mix(in oklch, var(--success) 12%, transparent)",
      "var(--success)",
    ],
    warning: [
      "color-mix(in oklch, var(--gold) 14%, transparent)",
      "var(--gold)",
    ],
    danger: [
      "color-mix(in oklch, var(--destructive) 10%, transparent)",
      "var(--destructive)",
    ],
  }[tom];

  return (
    <div className="rounded-xl bg-card p-4.5 ring-hairline">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground">
          {rotulo}
        </span>
        <span
          className="grid size-8 place-items-center rounded-lg"
          style={{ background: cores[0], color: cores[1] }}
        >
          {icone}
        </span>
      </div>
      <p
        className="mt-3 font-display text-[26px] leading-none tabular-nums"
        style={{ color: cores[1] }}
      >
        {valor}
      </p>
      {dica && (
        <p className="mt-1.5 text-[11.5px] text-muted-foreground/70">{dica}</p>
      )}
    </div>
  );
}
