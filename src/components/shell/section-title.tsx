import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Título de seção com a assinatura de marca — uma barra vertical em gradiente
 * teal→gold antes do serif (Fraunces). É o marcador ESTRUTURAL do kit premium:
 * dá identidade e ritmo a cada cabeçalho de card/seção, threading a cor de marca
 * por toda a interface. Reutilizável — use no lugar de um `<h2 className="font-display">`
 * cru sempre que a seção for uma âncora de conteúdo.
 */
export function SectionTitle({
  className,
  children,
  ...props
}: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-display flex items-center gap-2.5 tracking-tight",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="h-4 w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,var(--primary),var(--gold))]"
      />
      {children}
    </h2>
  );
}
