import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";

/** Barra padrão de Calendário e Fila: fixa, compacta, fora da rolagem do conteúdo. */
export function ShellHeader({ children }: { children: ReactNode }) {
  return (
    <header
      data-slot="shell-header"
      className="border-line bg-bg flex h-11 min-w-0 shrink-0 items-center gap-2.5 border-b px-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
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
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={buttonVariants({
        variant: "ghost",
        size: "icon-sm",
        className: "-ml-2 shrink-0",
      })}
    >
      <ChevronLeft />
    </Link>
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
        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}
