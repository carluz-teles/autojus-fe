"use client";

import { cn } from "@/lib/utils";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-border border-b pb-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-none font-normal tracking-tight">
            {titulo}
          </h1>
          {descricao && (
            <p className="text-muted-foreground mt-1.5 max-w-[620px] text-[13.5px]">
              {descricao}
            </p>
          )}
        </div>
        {acoes && <div className="flex items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </header>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("bg-card ring-hairline rounded-xl p-5", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Segmented<T extends string>({
  valor,
  opcoes,
  onChange,
  className,
}: {
  valor: T;
  opcoes: { valor: T; label: string; contagem?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/60 inline-flex gap-0.5 rounded-xl p-0.5",
        className,
      )}
    >
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            o.valor === valor
              ? "bg-card text-foreground ring-hairline"
              : "text-muted-foreground",
          )}
        >
          {o.label}
          {o.contagem && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[11px] tabular-nums">
              {o.contagem}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Abas sublinhadas — usadas em Configurações. */
export function UnderlineTabs<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T;
  opcoes: { valor: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <nav className="border-border flex flex-wrap gap-1 border-b">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={cn(
            "-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap",
            o.valor === valor
              ? "border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {o.label}
        </button>
      ))}
    </nav>
  );
}
