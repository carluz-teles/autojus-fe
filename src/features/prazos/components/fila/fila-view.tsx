"use client";
import { PrazosAgenda } from "@/features/prazos/components/agenda/prazos-agenda";

// "Meus Prazos" (meus, agenda por urgência) e "Fila" (todas ativas) são listas
// de INTIMAÇÕES — a intimação é a tarefa e carrega o prazo. (Antes era o board
// de action_items; agora é a agenda de intimações.)
export function FilaView({ meus, titulo }: { meus?: boolean; titulo: string }) {
  return <PrazosAgenda meus={meus} titulo={titulo} />;
}
