"use client";

// Autor × Réu inline — reusado pelo preview lateral da lista de intimações e
// pela tela de detalhe. Puxa `/v1/processos/:id/partes` (mesmo endpoint do
// cockpit) via React Query, então múltiplas instâncias com o mesmo
// courtRecordId reusam a mesma request. Mostra "—" no lado que estiver
// ausente (execução/JEC frequentemente têm só um polo materializado).

import { usePartes } from "@/features/processos/hooks/use-processos";

export function PartesInline({ courtRecordId }: { courtRecordId: string }) {
  const { data, isPending } = usePartes(courtRecordId);

  if (isPending) return <span className="text-muted-foreground">…</span>;

  const autor = data?.autor[0]?.name || "—";
  const reu = data?.reu[0]?.name || "—";
  return (
    <span
      title={`${autor} × ${reu}`}
      aria-label={`Autor: ${autor}. Réu: ${reu}.`}
    >
      {autor} <span className="text-muted-foreground">×</span> {reu}
    </span>
  );
}
