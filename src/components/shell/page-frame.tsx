import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Barra padrão de Calendário e Fila: fixa, compacta, fora da rolagem do conteúdo. */
export function ShellHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="shell-header"
      className={cn(
        "border-line bg-background/95 flex min-h-11 min-w-0 shrink-0 items-center gap-2.5 border-b px-3 py-1 sm:px-4 md:h-11 md:py-0",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 md:flex-nowrap">
        {children}
      </div>
    </header>
  );
}

export function ShellBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Tooltip
      label={label}
      render={
        <Link
          href={href}
          aria-label={label}
          data-slot="button"
          className={buttonVariants({
            variant: "ghost",
            size: "icon-sm",
            className: "-ml-2 shrink-0",
          })}
        />
      }
    >
      <ChevronLeft aria-hidden />
    </Tooltip>
  );
}

/** O shell tem uma única área de rolagem; o cabeçalho permanece visível. */
export function PageFrame({
  header,
  toolbar,
  children,
}: {
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <ShellHeader>{header}</ShellHeader>
      {toolbar}
      {/* Contém também os rótulos sr-only, que usam position: absolute. */}
      <div
        data-slot="page-content"
        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {children}
      </div>
    </div>
  );
}
