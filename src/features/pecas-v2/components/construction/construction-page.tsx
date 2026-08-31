"use client";

// Tela "Construção de peça" (/pecas/[id]) — máquina de estados do CENTRO.
// A barra do topo e o rail de contexto à esquerda (do fluxo pré-geração)
// permanecem fixos entre estágios; só o CENTRO muda:
//
//   stage="pregen"  → EmptyCenter   (CTA "Gerar minuta")
//   stage="gerando" → GerandoCenter (a IA redige, streamed em tempo real)
//   stage="pronta"  → EditorCenter  (WYSIWYG + teses inline) + slot Assistente
//
// O painel "Assistente" à direita fica DEFERIDO neste milestone — só um
// placeholder de largura fixa quando a peça está pronta (pra o layout casar
// com o design). Componente = JSX + binding; a lógica vive no useConstruction.

import { useRef, useState } from "react";

import { useConstruction } from "../../hooks/use-construction";
import { draftToPecaContexto } from "../../lib/peca-contexto";
import { ContextRail } from "../pregen/context-rail";
import { EmptyCenter } from "../pregen/empty-center";
import { TesesRail } from "../pregen/teses-rail";
import { TopBar } from "../pregen/top-bar";
import type { RichEditorHandle } from "../rich-editor/rich-editor";
import { AssistentePanel } from "./assistente-panel";
import { EditorCenter } from "./editor-center";
import { GerandoCenter } from "./gerando-center";
import { TeorDrawer } from "./teor-drawer";

export function ConstructionPage({ id }: { id: string }) {
  const {
    draft,
    isLoading,
    isError,
    stage,
    theses,
    highlightedDocId,
    focusSource,
    gerarMinuta,
    isGenerating,
    voltar,
  } = useConstruction(id);

  // Drawer lateral do teor/autos (UI local efêmera).
  const [teorAberto, setTeorAberto] = useState(false);
  // Ref pro editor — compartilhado com o Assistente pra aplicar propostas no
  // content_html vivo (fonte-única).
  const editorRef = useRef<RichEditorHandle | null>(null);

  if (isLoading) return <PageSkeleton />;
  if (isError || !draft) return <PageError onBack={voltar} />;

  const teorLaudas = Math.max(
    1,
    Math.round((draft.intimation.teor?.length ?? 0) / 2100),
  );

  const tesesLabel =
    theses.selectedCount === 1 ? "1 tese" : `${theses.selectedCount} teses`;

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col text-[13px]">
      <TopBar
        title={draft.title}
        cnjShort={shortCnj(draft.process.cnj)}
        onBack={voltar}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ContextRail
          contexto={draftToPecaContexto(draft)}
          highlightedDocId={highlightedDocId}
          onVerTeor={() => setTeorAberto(true)}
          tesesSlot={
            <TesesRail
              theses={theses.theses}
              selectedCount={theses.selectedCount}
              isLoading={theses.isLoading}
              isError={theses.isError}
              onToggle={theses.toggle}
              onFonte={focusSource}
              isRegenerating={theses.isRegenerating}
            />
          }
        />

        {/* CENTRO — muda por estágio */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-[color-mix(in_oklch,var(--foreground)_4%,var(--background))]">
          {stage === "pregen" && (
            <EmptyCenter
              pieceTitle={draft.title}
              selectedCount={theses.selectedCount}
              onGerar={gerarMinuta}
              isGenerating={isGenerating}
            />
          )}
          {stage === "gerando" && (
            <GerandoCenter
              draftId={draft.id}
              tesesLabel={tesesLabel}
              streamEnabled={draft.sagaState === "EXTRACTING"}
            />
          )}
          {stage === "pronta" && (
            <EditorCenter
              draft={draft}
              editorRef={editorRef}
              onRefazer={gerarMinuta}
            />
          )}
        </div>

        {/* ASSISTENTE — dirige o /iterate; Aceitar aplica no editor vivo (editorRef). */}
        {stage === "pronta" && (
          <AssistentePanel
            draftId={draft.id}
            applyToEditor={(roman, novos) =>
              editorRef.current?.applySectionChange(roman, novos) ?? false
            }
          />
        )}
      </div>

      <TeorDrawer
        open={teorAberto}
        onClose={() => setTeorAberto(false)}
        titulo="Intimação de origem"
        tipo="Teor"
        meta={`Publicado ${draft.intimation.publishedAt} · DJEN · ~${teorLaudas} lauda${teorLaudas > 1 ? "s" : ""}`}
        conteudo={draft.intimation.teor}
      />
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
