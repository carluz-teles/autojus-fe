"use client";

// Tela "Construção de peça" em modo PARTIDA (/pecas/nova?intimacao=<id>) — a peça
// ainda NÃO existe. Mesma casca da Construção (TopBar + rail + centro vazio), mas
// escopada à INTIMAÇÃO: teses geradas da intimação + seleção efêmera. "Gerar minuta"
// materializa o draft e navega pra /pecas/[id]. Componente = JSX + binding; a lógica
// vive no usePartida.

import { usePartida } from "../../hooks/use-partida";
import { EmptyCenter } from "./empty-center";
import { PartidaRail } from "./partida-rail";
import { TesesRail } from "./teses-rail";
import { TopBar } from "./top-bar";

export function PartidaPage({ intimacaoId }: { intimacaoId: string }) {
  const {
    theses,
    selectedCount,
    isLoading,
    isError,
    toggle,
    onFonte,
    highlightedDocId,
    regenerate,
    isRegenerating,
    gerarMinuta,
    isGenerating,
    voltar,
  } = usePartida(intimacaoId);

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col text-[13px]">
      <TopBar title="Nova peça" cnjShort="" onBack={voltar} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PartidaRail
          intimacaoId={intimacaoId}
          theses={theses}
          highlightedDocId={highlightedDocId}
          tesesSlot={
            <TesesRail
              theses={theses}
              selectedCount={selectedCount}
              isLoading={isLoading}
              isError={isError}
              onToggle={toggle}
              onFonte={onFonte}
              onRegenerate={regenerate}
              isRegenerating={isRegenerating}
            />
          }
        />

        <div className="min-w-0 flex-1 overflow-y-auto bg-[color-mix(in_oklch,var(--foreground)_4%,var(--background))]">
          <EmptyCenter
            pieceTitle="peça"
            selectedCount={selectedCount}
            onGerar={gerarMinuta}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}
