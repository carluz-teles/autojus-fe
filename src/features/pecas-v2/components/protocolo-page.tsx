"use client";

// Step Protocolo (Fatia 2a v0 — manual).
// O advogado protocola no PJe/e-SAJ FORA do sistema e volta aqui pra marcar.
// Input opcional: número/protocolo do tribunal. Ao confirmar, o BE grava
// filed_at + filing_number no draft; o router redireciona pra tela Concluída.

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useDraft } from "../hooks/use-draft";
import { useFilePeca } from "../hooks/use-workflow";
import { ConstrucaoHeader } from "./construcao-header";
import { PecaPreview } from "./peca-preview";

export function ProtocoloPage({ pecaId }: { pecaId: string }) {
  const { data: draft, isLoading } = useDraft(pecaId);
  const file = useFilePeca(pecaId);
  const [filingNumber, setFilingNumber] = useState("");

  const cnj = draft?.process.cnj;
  const crumbs = useMemo(
    () =>
      cnj
        ? [{ label: "Peticionamento" }, { label: `Processo ${cnj}` }]
        : [{ label: "Peticionamento" }],
    [cnj],
  );
  useSetBreadcrumb(crumbs);

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }
  if (!draft) return null;

  const handleFile = () => {
    file.mutate(filingNumber.trim(), {
      onError: () => toast.error("Não foi possível marcar como protocolada."),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConstrucaoHeader step={3} enviarDisabled backHref="/pecas" />

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
              Marcar como protocolada
            </h2>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              Protocole a peça no sistema do tribunal (PJe, e-SAJ, eproc) e
              volte aqui para registrar. O número do protocolo é opcional.
            </p>

            <label className="mt-4 block">
              <span className="text-foreground text-[12px]">
                Número do protocolo (opcional)
              </span>
              <Input
                className="mt-1.5"
                placeholder="ex.: 12345678"
                value={filingNumber}
                onChange={(e) => setFilingNumber(e.target.value)}
                disabled={file.isPending}
              />
            </label>

            <Button
              className="mt-4 w-full"
              onClick={handleFile}
              disabled={file.isPending}
            >
              {file.isPending ? "Salvando…" : "Marcar como protocolada"}
            </Button>
          </div>

          {draft.signedPDFURL && (
            <a
              href={draft.signedPDFURL}
              target="_blank"
              rel="noreferrer"
              className="border-border hover:bg-muted rounded-xl border px-5 py-4 text-center text-[13.5px] font-medium no-underline"
            >
              ↓ Baixar peça assinada (PDF)
            </a>
          )}

          <div className="border-border/60 bg-muted/30 rounded-xl border p-4 text-[11.5px] leading-relaxed">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Débito:</strong> integração
              automática com PJe/e-SAJ (protocolar direto daqui) fica pra fatia
              futura. Por ora, o fluxo é manual.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
