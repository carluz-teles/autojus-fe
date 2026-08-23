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
  const child = showPartida ? (
    <PecaPartida id={id} onWorkspace={() => setSkipPartida(true)} />
  ) : (
    <PecaWorkspace id={id} />
  );

  // Cancela o padding do <main> do AppShell (px-6 py-10). O fluxo de
  // peticionamento tem shell própria (PecaTopBar + coluna Contexto) que
  // precisa encostar no header e na sidebar principal — sem "moldura" em
  // volta, como no mockup.
  return (
    <div className="-mx-6 -my-10 flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
      {child}
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
