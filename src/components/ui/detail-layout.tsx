import Link from "next/link";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

// Cabeçalho + corpo das telas de DETALHE de entidade (Intimação/Prazo/Tarefa/
// Peça/Processo). Composição por slots: breadcrumb, título+status à esquerda,
// ações à direita, faixa de Tabs (a feature passa <Tabs>) e corpo em grade
// multi-coluna responsiva. Só JSX + binding.

export interface Crumb {
  label: React.ReactNode;
  href?: string;
}

/** Trilha de navegação — "Processos / 5001234…". O último item é o atual. */
export function DetailBreadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Trilha"
      className={cn(
        "text-muted-foreground flex min-w-0 flex-nowrap items-center gap-1.5 text-sm",
        className,
      )}
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="hover:text-foreground shrink-0 rounded transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast &&
                    "text-foreground min-w-0 truncate font-medium tabular-nums",
                )}
                aria-current={isLast ? "page" : undefined}
                title={
                  isLast && typeof c.label === "string" ? c.label : undefined
                }
              >
                {c.label}
              </span>
            )}
            {!isLast ? (
              <span aria-hidden className="shrink-0 text-xs opacity-60">
                ›
              </span>
            ) : null}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * Cabeçalho de detalhe: breadcrumb em cima; título (Fraunces) + status à
 * esquerda; ações à direita (ex.: botão primário + "Mais ações"). `status` e
 * `subtitle` são slots opcionais.
 */
export function DetailHeader({
  breadcrumb,
  title,
  status,
  subtitle,
  actions,
  className,
}: {
  breadcrumb?: Crumb[];
  title: React.ReactNode;
  status?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("reveal flex flex-col gap-4", className)}>
      {breadcrumb ? <DetailBreadcrumb items={breadcrumb} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl leading-none tracking-tight tabular-nums sm:text-3xl">
              {title}
            </h1>
            {status}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Corpo em grade multi-coluna responsiva. Empilha em 1 coluna no mobile; em
 * telas largas, `aside` (se passado) vira a coluna lateral fixa e `children`
 * ocupa o resto. Sem `aside`, é só um container fluido.
 */
export function DetailBody({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  if (!aside) {
    return <div className={cn("mt-6", className)}>{children}</div>;
  }
  return (
    <div
      className={cn(
        "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <aside className="flex flex-col gap-4">{aside}</aside>
    </div>
  );
}

/**
 * Composição completa: cabeçalho + (faixa de) Tabs + corpo. A feature passa o
 * <Tabs>…</Tabs> inteiro em `children` (que já contém TabsList + TabsContent),
 * ou monta manualmente com DetailHeader/DetailBody quando quer controle fino.
 */
export function DetailLayout({
  header,
  children,
  className,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {header}
      <div className="mt-6">{children}</div>
    </div>
  );
}
