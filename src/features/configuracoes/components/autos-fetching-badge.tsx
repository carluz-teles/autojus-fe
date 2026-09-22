"use client";

import { RefreshCw } from "lucide-react";

import { useSyncAutos } from "../hooks/use-sync-autos";
import type { AutosSyncScope } from "../lib/autos-sync";

/**
 * Badge at-a-glance no TOPO do cockpit: "Buscando autos do tribunal…" quando o
 * eproc está puxando os autos DESTE processo — seja on-demand (clique) ou pelo
 * drain global do backlog. Dá a CLAREZA sem o usuário precisar cavar a aba Autos.
 * Reusa o polling de status do use-sync-autos (deduped por queryKey), então não
 * duplica rede com o SyncAutosButton da aba.
 */
export function AutosFetchingBadge(scope: AutosSyncScope) {
  const { pending } = useSyncAutos(scope);
  if (!scope.courtRecordId || !pending) return null;
  return (
    <span className="text-primary bg-primary/10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
      <RefreshCw className="size-3 shrink-0 animate-spin" aria-hidden />
      Buscando autos do tribunal…
    </span>
  );
}
