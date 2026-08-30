"use client";

// Tela "Construção de peça" — estado PRÉ-GERAÇÃO (antes de "Gerar minuta").
// Full-bleed: barra contextual no topo, rail de contexto à esquerda (processo,
// intimação, partes, FUNDADA EM, TESES A INCLUIR) e centro vazio com o CTA
// "Gerar minuta". Componente = JSX + binding; a lógica vive no usePreGeneration.

import { usePreGeneration } from "../../hooks/use-pre-generation";
import { ContextRail } from "./context-rail";
import { EmptyCenter } from "./empty-center";
import { TesesRail } from "./teses-rail";
import { TopBar } from "./top-bar";

export function PreGenerationPage({ id }: { id: string }) {
  const {
    draft,
    isLoading,
    isError,
    theses,
    highlightedDocId,
    focusSource,
    gerarMinuta,
    isGenerating,
    voltar,
  } = usePreGeneration(id);

  if (isLoading) return <PageSkeleton />;
  if (isError || !draft) return <PageError onBack={voltar} />;

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col text-[13px]">
      <TopBar
        title={draft.title}
        cnjShort={shortCnj(draft.process.cnj)}
        onBack={voltar}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ContextRail
          draft={draft}
          highlightedDocId={highlightedDocId}
          tesesSlot={
            <TesesRail
              theses={theses.theses}
              selectedCount={theses.selectedCount}
              isLoading={theses.isLoading}
              isError={theses.isError}
              onToggle={theses.toggle}
              onFonte={focusSource}
              onRegenerate={theses.regenerate}
              isRegenerating={theses.isRegenerating}
            />
          }
        />

        <div className="min-w-0 flex-1 overflow-y-auto bg-[color-mix(in_oklch,var(--foreground)_4%,var(--background))]">
          <EmptyCenter
            pieceTitle={draft.title}
            selectedCount={theses.selectedCount}
            onGerar={gerarMinuta}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}

/** Último segmento do CNJ (ex.: "…8.26.0100" → "0100") pra o chip da barra. */
function shortCnj(cnj: string): string {
  if (!cnj) return "";
  const parts = cnj.split(".");
  return parts.length > 1 ? parts.slice(-2).join(".") : cnj;
}

function PageSkeleton() {
  return (
    <div className="bg-background flex h-dvh flex-col">
      <div className="border-line h-[45px] flex-none border-b" />
      <div className="flex min-h-0 flex-1">
        <div className="border-line bg-panel w-72 flex-none border-r p-4">
          <div className="bg-hover mb-3 h-3 w-32 animate-pulse rounded" />
          <div className="bg-hover mb-2 h-16 w-full animate-pulse rounded-lg" />
          <div className="bg-hover mb-2 h-24 w-full animate-pulse rounded-lg" />
          <div className="bg-hover h-40 w-full animate-pulse rounded-lg" />
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}

function PageError({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-background text-foreground flex h-dvh flex-col items-center justify-center gap-3">
      <p className="text-fg2 text-sm">Não foi possível carregar esta peça.</p>
      <button
        type="button"
        onClick={onBack}
        className="border-line rounded-md border px-3 py-1.5 text-xs"
      >
        Voltar
      </button>
    </div>
  );
}
