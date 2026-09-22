import { cn } from "@/lib/utils";

import { Skeleton } from "./skeleton";

// Blocos de skeleton REUTILIZÁVEIS — a regra do app: todo loading de FETCH de
// dados de tela usa skeleton (nunca "Carregando…" cru nem spinner). Spinners
// ficam só pra AÇÃO (botão de mutation, "Carregar mais"). Corrige a classe:
// as telas compõem estes blocos em vez de reinventar o loading caso a caso.

/**
 * Linhas repetidas — loading de LISTAS/COLEÇÕES (registros de um processo,
 * tribunais, certificados, conversa do assistente…).
 */
export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn("divide-line/60 flex flex-col divide-y", className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading de página de DETALHE (intimação / processo / peça) e fallbacks de
 * rota: identidade + herói + grade de painéis. Substitui o "Carregando…" cru.
 */
export function SkeletonDetail() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6"
    >
      <div className="space-y-3 border-b pb-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-2/3 max-w-lg" />
        <Skeleton className="h-4 w-1/2 max-w-md" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
