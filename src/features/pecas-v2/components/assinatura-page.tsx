"use client";

// Step Assinatura (Fatia 2a — placeholder da 2b).
// Preview da peça em read-only + card lateral com Assinar / Voltar.
// Assinatura real de PDF (PAdES via GCP KMS + digitorus/pdfsign) fica pra
// Fatia 2b — este passo só marca signed_at no draft.

import { useState } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";

import { useDraft } from "../hooks/use-draft";
import { useRevertToConstruction, useSignPeca } from "../hooks/use-workflow";
import { ConstrucaoHeader } from "./construcao-header";
import { PecaPreview } from "./peca-preview";

export function AssinaturaPage({ pecaId }: { pecaId: string }) {
  const { data: draft, isLoading } = useDraft(pecaId);
  const sign = useSignPeca(pecaId);
  const revert = useRevertToConstruction(pecaId);
  const [confirming, setConfirming] = useState(false);

  useSetBreadcrumb(
    draft?.process.cnj
      ? [{ label: "Peticionamento" }, { label: `Processo ${draft.process.cnj}` }]
      : [{ label: "Peticionamento" }],
  );

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }
  if (!draft) return null;

  const handleSign = () => {
    sign.mutate(undefined, {
      onError: () => toast.error("Não foi possível assinar a peça."),
    });
  };

  const handleRevert = () => {
    revert.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível voltar (peça já assinada?)."),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConstrucaoHeader step={2} enviarDisabled backHref="/pecas" />

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-8 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-y-auto">
          <PecaPreview
            title={draft.title}
            preamble={draft.preamble}
            sections={draft.sections}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="border-border rounded-xl border p-5">
            <h2 className="font-display text-lg font-medium">
              Pronto para assinar
            </h2>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              Revise a peça ao lado. Ao assinar, a peça é marcada como pronta
              para protocolo e não pode mais ser editada.
            </p>

            {!confirming ? (
              <Button
                className="mt-4 w-full"
                onClick={() => setConfirming(true)}
                disabled={sign.isPending}
              >
                Assinar peça
              </Button>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-foreground text-[13px]">
                  Confirmar a assinatura?
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSign}
                    disabled={sign.isPending}
                  >
                    {sign.isPending ? "Assinando…" : "Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirming(false)}
                    disabled={sign.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRevert}
              disabled={revert.isPending}
              className="text-muted-foreground hover:text-foreground mt-3 w-full text-[12px] underline underline-offset-2 disabled:opacity-50"
            >
              Voltar para Construção
            </button>
          </div>

          <div className="border-border/60 bg-muted/30 rounded-xl border p-4 text-[11.5px] leading-relaxed">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Débito:</strong> nesta versão
              a assinatura é apenas um marco. A assinatura digital real do PDF
              (ICP-Brasil via GCP KMS) chega na próxima fatia.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
