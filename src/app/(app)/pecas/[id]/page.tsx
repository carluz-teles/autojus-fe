"use client";

import { useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

import { PecaPartida } from "@/features/pecas/components/peca-partida";
import { useGerarPeca, usePeca } from "@/features/pecas/hooks/use-peca";
import { AssinaturaPage } from "@/features/pecas-v2/components/assinatura-page";
import { ConcluidaPage } from "@/features/pecas-v2/components/concluida-page";
import { ConstrucaoPage } from "@/features/pecas-v2/components/construcao-page";
import { ProtocoloPage } from "@/features/pecas-v2/components/protocolo-page";
import { useDraft } from "@/features/pecas-v2/hooks/use-draft";
import { deriveStep } from "@/features/pecas-v2/types";

// Rota da peça — roteador por STEP:
//   1) saga_state=CREATED + content vazio → PecaPartida (v1, tela de teses).
//   2) Caso contrário, deriva step do draft v2:
//        Construção → ConstrucaoPage
//        Assinatura → AssinaturaPage
//        Protocolo  → ProtocoloPage
//        Concluída  → ConcluidaPage
//   Cada tela é responsável pelo seu próprio layout (header/stepper/aside).

function isPartidaState(
  peca: { saga_state: string; content: string } | undefined,
) {
  if (!peca) return false;
  return peca.saga_state === "CREATED" && !peca.content?.trim();
}

function PecaPageClient({ id }: { id: string }) {
  const { data: peca, isLoading: partidaLoading } = usePeca(id);
  // draft v2 é a fonte pra derivar o step (tem os 3 timestamps do workflow).
  const { data: draftV2 } = useDraft(id);
  const params = useSearchParams();
  // ?blank=1 chega quando o usuário escolheu "Redigir manualmente" em
  // /pecas/nova — pula a Partida legada e vai direto pra Construção.
  const forceBlank = params.get("blank") === "1";
  const [skipPartida, setSkipPartida] = useState(forceBlank);

  // Auto-generate handoff: /pecas/nova grava o payload de generate em
  // sessionStorage[`pecas:autogen:${id}`] e navega pra cá. Disparamos generate
  // DE DENTRO desta rota (não da /nova) pra garantir que o useDraftStream
  // no ConstrucaoPage monte ANTES de o worker-ai emitir o primeiro token —
  // se generate fosse chamado antes de navegar, o gap entre `router.push` e
  // o `useDraftStream` conectar perderia o começo do streaming.
  const gerarPeca = useGerarPeca();
  const autogenDispatched = useRef(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (autogenDispatched.current || !peca) return;
    const key = `pecas:autogen:${id}`;
    const raw =
      typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
    if (!raw) return;
    autogenDispatched.current = true;
    sessionStorage.removeItem(key);
    // Só faz sentido disparar autogen numa peça que ainda não gerou.
    if (peca.saga_state !== "CREATED" || peca.content?.trim()) return;
    setSkipPartida(true); // pula a Partida legada — vamos pra Construção agora
    try {
      const body = JSON.parse(raw);
      gerarPeca.mutate({ id, body });
    } catch {
      // payload corrompido — ignora silenciosamente
    }
  }, [id, peca, gerarPeca]);

  if (partidaLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  const showPartida = !skipPartida && isPartidaState(peca);

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
      {showPartida ? (
        <PecaPartida id={id} onWorkspace={() => setSkipPartida(true)} />
      ) : (
        <PecaByStep
          pecaId={id}
          step={draftV2 ? deriveStep(draftV2) : "construcao"}
        />
      )}
    </div>
  );
}

function PecaByStep({
  pecaId,
  step,
}: {
  pecaId: string;
  step: "construcao" | "assinatura" | "protocolo" | "concluida";
}) {
  switch (step) {
    case "assinatura":
      return <AssinaturaPage pecaId={pecaId} />;
    case "protocolo":
      return <ProtocoloPage pecaId={pecaId} />;
    case "concluida":
      return <ConcluidaPage pecaId={pecaId} />;
    case "construcao":
    default:
      return <ConstrucaoPage pecaId={pecaId} />;
  }
}

export default function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PecaPageClient id={id} />;
}
