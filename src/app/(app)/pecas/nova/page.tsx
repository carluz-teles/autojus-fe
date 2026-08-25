"use client";

// /pecas/nova?intimation_id=X[&piece_type=Y] — Partida ephemeral.
// Nada de POST /v1/pecas aqui; só quando o usuário confirma "Gerar" ou
// "Redigir manualmente" a peça é criada (dentro do PartidaEphemeral). Isso
// evita rascunho zumbi a cada clique em "Redigir peça" na intimação.
//
// piece_type é OPCIONAL — a PartidaEphemeral tem um <Select> inline no
// título pra o advogado escolher. Quando ausente, cai em "OTHER" como default
// mas o usuário troca imediatamente na tela.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { PartidaEphemeral } from "@/features/pecas/components/partida-ephemeral";

function NovaPecaPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const intimationId = params.get("intimation_id") ?? "";
  const pieceType = params.get("piece_type") ?? "OTHER";

  // intimation_id é obrigatório — sem ele não há o que renderizar.
  useEffect(() => {
    if (!intimationId) router.replace("/pecas");
  }, [intimationId, router]);

  if (!intimationId) return null;

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
      <PartidaEphemeral intimationId={intimationId} pieceType={pieceType} />
    </div>
  );
}

export default function NovaPecaPage() {
  return (
    <Suspense fallback={null}>
      <NovaPecaPageInner />
    </Suspense>
  );
}
