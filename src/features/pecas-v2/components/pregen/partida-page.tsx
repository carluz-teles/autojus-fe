"use client";

// Tela "Construção de peça" em modo PARTIDA (/pecas/nova?intimacao=<id>) — a peça
// ainda NÃO existe. Usa EXATAMENTE a mesma casca da Construção (TopBar + ContextRail
// rico + Teor drawer + centro vazio), só que o contexto vem da INTIMAÇÃO (não de um
// draft) e o centro mostra o CTA "Gerar minuta". "Gerar minuta" materializa o draft e
// dispara a geração — a partir daí é /pecas/[id] com a mesma cara.

import { useState } from "react";

import { usePartida } from "../../hooks/use-partida";
import { TeorDrawer } from "../construction/teor-drawer";
import { ContextRail } from "./context-rail";
import { EmptyCenter } from "./empty-center";
import { TesesRail } from "./teses-rail";
import { TopBar } from "./top-bar";

export function PartidaPage({ intimacaoId }: { intimacaoId: string }) {
  const {
    contexto,
    theses,
    selectedCount,
    isLoading,
    isError,
    toggle,
    onFonte,
    highlightedDocId,
    isRegenerating,
    gerarMinuta,
    isGenerating,
    teor,
    voltar,
  } = usePartida(intimacaoId);

  const [teorAberto, setTeorAberto] = useState(false);
  const teorLaudas = Math.max(1, Math.round((teor?.length ?? 0) / 2100));

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col text-[13px]">
      <TopBar
        title="Nova peça"
        cnjShort={contexto?.processo.cnj ?? ""}
        onBack={voltar}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {contexto ? (
          <ContextRail
            contexto={contexto}
            highlightedDocId={highlightedDocId}
            onVerTeor={() => setTeorAberto(true)}
            // Partida (pré-geração) não tem autos ainda — nada a abrir.
            onVerAuto={() => {}}
            openingDocId={null}
            tesesSlot={
              <TesesRail
                theses={theses}
                selectedCount={selectedCount}
                isLoading={isLoading}
                isError={isError}
                onToggle={toggle}
                onFonte={onFonte}
                teorSourceId={contexto.intimacao.id}
                isRegenerating={isRegenerating}
                pregen
              />
            }
          />
        ) : (
          <RailSkeleton />
        )}

        <div className="min-w-0 flex-1 overflow-y-auto bg-[color-mix(in_oklch,var(--foreground)_4%,var(--background))]">
          <EmptyCenter
            pieceTitle="peça"
            selectedCount={selectedCount}
            onGerar={gerarMinuta}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {contexto && (
        <TeorDrawer
          open={teorAberto}
          onClose={() => setTeorAberto(false)}
          titulo="Intimação de origem"
          tipo="Teor"
          meta={`Publicado ${contexto.intimacao.publishedAt} · DJEN · ~${teorLaudas} lauda${teorLaudas > 1 ? "s" : ""}`}
          conteudo={teor}
        />
      )}
    </div>
  );
}

/** Esqueleto do rail enquanto o contexto da intimação carrega. */
function RailSkeleton() {
  return (
    <div className="border-line bg-panel w-72 flex-none border-r p-4">
      <div className="bg-hover mb-3 h-3 w-32 animate-pulse rounded" />
      <div className="bg-hover mb-2 h-16 w-full animate-pulse rounded-lg" />
      <div className="bg-hover mb-2 h-24 w-full animate-pulse rounded-lg" />
      <div className="bg-hover h-40 w-full animate-pulse rounded-lg" />
    </div>
  );
}
