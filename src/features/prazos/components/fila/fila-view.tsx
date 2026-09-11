"use client";
import { WorkList } from "@/features/action-items/components/work-list";
export function FilaView({ meus, titulo }: { meus?: boolean; titulo: string }) {
  // Meus Prazos usa a vista "Prazo" (agenda por urgência); a Fila herdada segue lista plana.
  return <WorkList title={titulo} mine={meus} activeOnly deadlineAgenda={meus} />;
}
