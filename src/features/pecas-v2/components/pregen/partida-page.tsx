"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { usePartida } from "../../hooks/use-partida";
import type { PecaContextoDoc } from "../../lib/peca-contexto";
import { PdfDrawer } from "../construction/pdf-drawer";
import { SourceActions } from "../construction/source-actions";
import { TeorDrawer } from "../construction/teor-drawer";
import { ContextRail } from "./context-rail";
import { PieceIntentSummary } from "./piece-intent-summary";
import { TesesRail } from "./teses-rail";
import { TopBar } from "./top-bar";
export function PartidaPage({ intimacaoId }: { intimacaoId: string }) {
  const h = usePartida(intimacaoId);
  const [showMissing, setShowMissing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [teorOpen, setTeorOpen] = useState(false);
  const [doc, setDoc] = useState<{
    id: string;
    titulo: string;
    meta: string;
    initialPage?: number;
  } | null>(null);
  const openDoc = (d: PecaContextoDoc) =>
    setDoc({ id: d.id, titulo: d.name, meta: d.meta });
  const fonte = (id: string, page?: number) => {
    if (id === intimacaoId || !id) setTeorOpen(true);
    else {
      const d = h.contexto?.autos.find((a) => a.id === id);
      setDoc({
        id,
        titulo: d?.name ?? "Documento de origem",
        meta: d?.meta ?? "",
        initialPage: page,
      });
    }
  };
  const rail = h.contexto ? (
    <ContextRail
      contexto={h.contexto}
      highlightedDocId={null}
      onVerTeor={() => setTeorOpen(true)}
      onVerAuto={openDoc}
      openingDocId={null}
      documentActions={<SourceActions courtRecordId={h.courtRecordId} />}
    />
  ) : (
    <p className="p-4">Carregando contexto…</p>
  );
  return (
    <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar
        title="Nova peça"
        state="Teses"
        cnjShort={h.contexto?.processo.cnj ?? ""}
        onBack={h.voltar}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setContextOpen(true)}
            >
              Contexto e fontes
            </Button>
            {!h.existingDraft && (
              <Button
                size="sm"
                disabled={
                  h.isGenerating || h.isRegenerating || h.loadingContext
                }
                onClick={() => {
                  setShowMissing(true);
                  h.gerarMinuta();
                }}
              >
                {h.isGenerating ? "Gerando…" : "Gerar minuta"}
              </Button>
            )}
          </>
        }
      />
      <section
        aria-label="Configuração da peça"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-8">
          <h1 className="sr-only">Teses da peça</h1>
          {h.existingDraft ? (
            <section className="flex flex-col items-start gap-3 rounded-md border p-5">
              <h2 className="font-medium">Continue sua minuta</h2>
              <p className="text-muted-foreground text-sm">
                {h.existingDraft.title || "Rascunho salvo"}
              </p>
              <p className="text-muted-foreground text-sm">
                Esta origem já possui uma peça. Continue a edição para ajustar o
                texto e as teses.
              </p>
              <Button onClick={h.resume}>Continuar rascunho</Button>
            </section>
          ) : (
            <>
              <PieceIntentSummary
                value={h.preparation}
                onChange={h.setPreparation}
                parties={h.partyOptions}
                actions={h.providencias}
                showMissing={showMissing}
                disabled={h.isGenerating || h.loadingContext}
              />
              <p role="status" className="text-muted-foreground text-xs">
                {h.selectedCount === 1
                  ? "1 tese selecionada"
                  : `${h.selectedCount} teses selecionadas`}
              </p>
              <TesesRail
                theses={h.theses}
                selectedCount={h.selectedCount}
                isLoading={h.isLoading}
                isError={h.isError}
                onToggle={h.toggle}
                onFonte={fonte}
                teorSourceId={intimacaoId}
                isRegenerating={h.isRegenerating || h.isGenerating}
                onRegenerate={h.regenerate}
                pregen
              />
            </>
          )}
        </div>
      </section>
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent title="Contexto e fontes">{rail}</SheetContent>
      </Sheet>
      <TeorDrawer
        open={teorOpen}
        onClose={() => setTeorOpen(false)}
        titulo="Intimação de origem"
        tipo="Teor"
        meta={`Publicação: ${h.contexto?.intimacao.publishedAt ?? "Não informada"}`}
        conteudo={h.teor}
      />
      <PdfDrawer doc={doc} onClose={() => setDoc(null)} />
    </div>
  );
}
