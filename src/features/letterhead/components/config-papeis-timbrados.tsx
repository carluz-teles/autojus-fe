"use client";

import { Info, Plus, Stamp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import { useLetterheads } from "../hooks/use-letterheads";
import type { LetterheadView } from "../types";
import { LetterheadCard } from "./letterhead-card";
import { LetterheadSheet } from "./letterhead-sheet";

/**
 * Aba "Papéis timbrados" das Configurações: grid de cards (+ tile de adicionar),
 * estados de carregamento/erro/vazio e o sheet de adicionar/editar. O estado de
 * servidor vem de useLetterheads; só a abertura do sheet é UI local.
 */
export function ConfigPapeisTimbrados() {
  const { data: letterheads, isLoading, isError, refetch } = useLetterheads();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<LetterheadView | null>(null);

  function abrirNovo() {
    setEditing(null);
    setSheetOpen(true);
  }

  function abrirEdicao(letterhead: LetterheadView) {
    setEditing(letterhead);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-[20px] font-medium">
            Papéis timbrados
          </div>
          <p className="text-fg3 mt-1 max-w-[46ch] text-[12.5px] leading-[1.5]">
            Suba os papéis timbrados do escritório. Na exportação e na
            assinatura, a peça é impressa por cima do timbrado — só a identidade
            visual muda, o texto nunca.
          </p>
        </div>
        {letterheads?.length ? (
          <Button size="sm" onClick={abrirNovo}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        ) : null}
      </div>

      {isError ? (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/5 mt-5 flex flex-col items-start gap-3 rounded-xl border p-5"
        >
          <p>Não foi possível carregar os papéis timbrados.</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : !letterheads?.length ? (
        <EmptyState
          className="mt-5"
          icon={Stamp}
          title="Nenhum papel timbrado ainda"
          description="Adicione o timbre do escritório para usá-lo na exportação e na assinatura das peças."
          action={
            <Button onClick={abrirNovo}>
              <Plus data-icon="inline-start" />
              Adicionar papel timbrado
            </Button>
          }
        />
      ) : (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {letterheads.map((lh) => (
            <LetterheadCard key={lh.id} letterhead={lh} onEdit={abrirEdicao} />
          ))}
          <button
            type="button"
            onClick={abrirNovo}
            className="border-border text-fg2 bg-card/60 hover:border-primary hover:text-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-4 text-center transition-colors outline-none focus-visible:ring-3"
          >
            <Plus className="size-6" strokeWidth={1.5} aria-hidden />
            <span className="text-[13px] font-medium">
              Adicionar papel timbrado
            </span>
            <span className="text-fg3 text-xs">PNG ou JPEG · proporção A4</span>
          </button>
        </div>
      )}

      {letterheads?.length ? (
        <p className="text-fg3 mt-6 flex items-center gap-1.5 text-[12.5px]">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Dica: para preencher a página sem sobra, use um asset em proporção A4
          (2480×3508 px @300dpi).
        </p>
      ) : null}

      <LetterheadSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
      />
    </>
  );
}
