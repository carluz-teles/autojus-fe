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
    <div className="bg-card ring-hairline rounded-xl p-4.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.06em] uppercase">
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
        className="font-display mt-3 text-[26px] leading-none tabular-nums"
        style={{ color: cores[1] }}
      >
        {valor}
      </p>
      {dica && (
        <p className="text-muted-foreground/70 mt-1.5 text-[11.5px]">{dica}</p>
      )}
    </div>
  );
}
