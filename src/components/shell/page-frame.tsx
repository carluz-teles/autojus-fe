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

// Atmosfera premium GLOBAL — brilho radial sutil (primary no topo-centro, gold no
// topo-direito) + um sussurro de teal na base, saindo do branco puro. Aplicada aqui,
// na única área de rolagem, TODA tela do app herda a mesma casca (fundo com tom +
// profundidade) sem competir com o conteúdo. `local` ancora o brilho ao topo do
// conteúdo (rola junto). Individual pages não precisam mais do próprio wrapper.
const PAGE_BACKDROP =
  "radial-gradient(ellipse 70% 40% at 50% -6%, color-mix(in oklch, var(--primary) 6%, transparent), transparent 60%), radial-gradient(ellipse 46% 36% at 100% 0%, color-mix(in oklch, var(--gold) 4%, transparent), transparent 55%)";

/**
 * O shell tem uma única área de rolagem; o cabeçalho permanece visível.
 *
 * `fill` (mesa-detalhe): quando a tela é um layout mestre-detalhe, o PageFrame
 * NÃO é o scrollport — a região de conteúdo vira um contêiner de altura definida
 * (`flex-1 min-h-0`, sem `overflow-y-auto` e sem `data-slot="page-content"`), e
 * a lista filha declara seu scrollport com `data-slot="page-content"`.
 * A lista infinita não estica o body; a prévia ocupa a altura disponível com
 * rolagem independente no corpo e CTAs fixos fora dele.
 */
export function PageFrame({
  header,
  toolbar,
  children,
  fill = false,
}: {
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  const backdrop = {
    backgroundColor:
      "color-mix(in oklch, var(--primary) 2.5%, var(--background))",
    backgroundImage: PAGE_BACKDROP,
    backgroundAttachment: "local" as const,
    backgroundRepeat: "no-repeat",
  };
  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <ShellHeader>{header}</ShellHeader>
      {fill && toolbar ? (
        <div data-slot="workspace-toolbar" className="shrink-0">
          {toolbar}
        </div>
      ) : (
        toolbar
      )}
      {fill ? (
        // Contêiner bounded: os filhos são os donos do overflow (scroll próprio).
        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={backdrop}
        >
          {children}
        </div>
      ) : (
        // Scrollport único da tela. Contém também os rótulos sr-only (absolute).
        <div
          data-slot="page-content"
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain"
          style={backdrop}
        >
          {children}
        </div>
      )}
    </div>
  );
}
