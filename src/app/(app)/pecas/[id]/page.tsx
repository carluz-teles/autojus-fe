"use client";

import { use, useState } from "react";

import { PecaPartida } from "@/features/pecas/components/peca-partida";
import { usePeca } from "@/features/pecas/hooks/use-peca";
import { ConstrucaoPage } from "@/features/pecas-v2/components/construcao-page";

// Rota da peça: se saga_state ainda é CREATED e content vazio, mostra a tela
// de partida (etapa 1 — teses/tom/instruções, features/pecas legado). Caso
// contrário, entra na tela de Construção v2 (editor + Iterar/Chat/Revisão).

function isPartidaState(
  peca: { saga_state: string; content: string } | undefined,
) {
  if (!peca) return false;
  return peca.saga_state === "CREATED" && !peca.content?.trim();
}

function PecaPageClient({ id }: { id: string }) {
  const { data: peca, isLoading } = usePeca(id);
  // Permite pular a tela de partida (usuário clica em "Prefiro começar em
  // branco" e cai direto no editor v2) sem mudar saga_state no BE.
  const [skipPartida, setSkipPartida] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  const showPartida = !skipPartida && isPartidaState(peca);

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
      {showPartida ? (
        <PecaPartida id={id} onWorkspace={() => setSkipPartida(true)} />
      ) : (
        <ConstrucaoPage pecaId={id} />
      )}
    </div>
  );
}

export default function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PecaPageClient id={id} />;
}
