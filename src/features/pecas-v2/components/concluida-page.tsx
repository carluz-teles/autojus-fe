"use client";

// Step Concluída — a peça foi protocolada. Read-only, mostra dados finais
// (número do protocolo, quando foi protocolada) + preview da peça.

import { useMemo } from "react";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";

import { useDraft } from "../hooks/use-draft";
import { ConstrucaoHeader } from "./construcao-header";
import { PecaPreview } from "./peca-preview";

export function ConcluidaPage({ pecaId }: { pecaId: string }) {
  const { data: draft, isLoading } = useDraft(pecaId);

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
            <span className="text-[11px] font-medium tracking-wider text-emerald-700 uppercase">
              ✓ Protocolada
            </span>
            <h2 className="font-display mt-2 text-lg font-medium">Concluída</h2>

            <dl className="mt-4 grid grid-cols-1 gap-2 text-[13px]">
              <div>
                <dt className="text-muted-foreground text-[11.5px]">Assinada em</dt>
                <dd className="text-foreground">
                  {draft.signedAt
                    ? formatarDataHora(draft.signedAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11.5px]">Protocolada em</dt>
                <dd className="text-foreground">
                  {draft.filedAt ? formatarDataHora(draft.filedAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11.5px]">
                  Número do protocolo
                </dt>
                <dd className="text-foreground tabular-nums">
                  {draft.filingNumber || "—"}
                </dd>
              </div>
            </dl>
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
        </aside>
      </div>
    </div>
  );
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
