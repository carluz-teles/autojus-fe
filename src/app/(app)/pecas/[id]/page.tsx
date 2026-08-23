"use client";

import { use, useState } from "react";

import { PecaPartida } from "@/features/pecas/components/peca-partida";
import { PecaWorkspace } from "@/features/pecas/components/peca-workspace";
import { usePeca } from "@/features/pecas/hooks/use-peca";

// Gate: CREATED + content vazio/nulo → tela de partida. Tudo mais → workspace.
function isPartidaState(
  peca: { saga_state: string; content: string } | undefined,
) {
  if (!peca) return false;
  return peca.saga_state === "CREATED" && !peca.content?.trim();
}

function PecaPageClient({ id }: { id: string }) {
  const { data: peca, isLoading } = usePeca(id);
  // Permite pular a tela de partida (ou navegar do workspace) sem mudar saga_state no BE.
  const [skipPartida, setSkipPartida] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  const showPartida = !skipPartida && isPartidaState(peca);

  if (showPartida) {
    return <PecaPartida id={id} onWorkspace={() => setSkipPartida(true)} />;
  }

  return <PecaWorkspace id={id} />;
}

export default function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PecaPageClient id={id} />;
}
