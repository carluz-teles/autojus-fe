import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Layout mestre-detalhe (Mesa de Trabalho e Intimações): lista à esquerda,
 * preview à direita no desktop. Em telas estreitas, o preview ocupa a região
 * de conteúdo. Lista e corpo da prévia rolam de forma independente; a lista permanece montada.
 */
export function MasterDetailLayout({
  painel,
  children,
}: {
  /** `null` = nenhum item selecionado (só a lista, largura cheia). */
  painel: ReactNode | null;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="workspace"
      className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <div
        data-slot="page-content"
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain",
          painel && "hidden lg:block",
        )}
      >
        {children}
      </div>
      {painel ? (
        <aside
          aria-label="Prévia da intimação"
          data-slot="workspace-preview"
          className="border-line bg-background h-full min-h-0 w-full min-w-0 shrink-0 overflow-hidden lg:w-[420px] lg:border-l xl:w-[460px]"
        >
          {painel}
        </aside>
      ) : null}
    </div>
  );
}
