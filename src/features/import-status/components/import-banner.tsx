"use client";

import { Loader2 } from "lucide-react";

import { useImportStatus } from "../hooks/use-import-status";

// Banner de importação nas telas de Processos e Intimações: enquanto o backfill do
// onboarding roda, avisa que os dados estão a caminho (senão a tabela vazia parece um
// erro). Some sozinho quando a importação termina (o hook para de reportar importing).
export function ImportBanner() {
  const { data } = useImportStatus();
  if (!data?.importing) return null;

  const done = data.slices_ok + data.slices_error;
  const total = data.total_slices;

  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
      <span>
        Estamos importando seus processos do último ano — eles vão aparecer aqui
        automaticamente, sem precisar recarregar.
        {total > 0 ? (
          <span className="text-amber-700 dark:text-amber-300">
            {" "}
            ({done}/{total})
          </span>
        ) : null}
      </span>
    </div>
  );
}
