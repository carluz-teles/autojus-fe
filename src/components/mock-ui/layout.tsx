"use client";

import { cn } from "@/lib/utils";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-none font-normal tracking-tight">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-1.5 max-w-[620px] text-[13.5px] text-muted-foreground">
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
    <section className={cn("rounded-xl bg-card p-5 ring-hairline", className)}>
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
        "text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground",
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
        "inline-flex gap-0.5 rounded-xl bg-muted/60 p-0.5",
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
            <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
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
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={cn(
            "-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap",
            o.valor === valor
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </nav>
  );
}
