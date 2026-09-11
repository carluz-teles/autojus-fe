"use client";

import { ChevronDown, FileText, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  type OpenDocument,
  PdfDrawer,
} from "@/features/documentos/components/pdf-drawer";

import {
  hasActionableFulfillment,
  isValidFulfillmentEvidence,
} from "../lib/fulfillment";
import type { ProvidenciaFulfillment } from "../types";

function sourceMeta(date: string, page: number) {
  return (
    [date, page > 0 ? `página ${page}` : ""].filter(Boolean).join(" · ") ||
    "Autos"
  );
}

export function ProvidenciaFulfillment({
  fulfillment,
  defaultOpen = false,
}: {
  fulfillment?: ProvidenciaFulfillment | null;
  defaultOpen?: boolean;
}) {
  const [document, setDocument] = useState<OpenDocument | null>(null);
  if (!hasActionableFulfillment(fulfillment)) return null;

  const coverageNote = fulfillment.sources.reason.trim();
  const evidence = fulfillment.evidence.filter(isValidFulfillmentEvidence);

  return (
    <>
      <Alert className="gap-2">
        {/* Colapsável no mesmo idiom das fontes/citações da construção de peça
            (details/summary nativo + chevron que gira em group-open). */}
        <details className="group/fulfillment" open={defaultOpen || undefined}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            Possível cumprimento nos autos
            <ChevronDown
              aria-hidden
              className="ml-auto size-4 shrink-0 transition-transform group-open/fulfillment:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="text-muted-foreground mt-3 flex flex-col gap-3 text-sm">
            {fulfillment.reason ? (
              <p className="whitespace-pre-wrap">{fulfillment.reason}</p>
            ) : null}
            {fulfillment.obligation_quote ? (
              <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
                <span className="text-muted-foreground block text-xs">
                  Obrigação analisada
                </span>
                {fulfillment.obligation_quote}
              </blockquote>
            ) : null}
            {evidence.length ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Evidência nos autos</p>
                {evidence.map((evidence, index) => {
                  const doc = {
                    id: evidence.document_id,
                    titulo:
                      evidence.title || `Documento ${evidence.document_id}`,
                    meta: sourceMeta(evidence.date, evidence.page),
                    initialPage: evidence.page > 0 ? evidence.page : undefined,
                  } satisfies OpenDocument;
                  return (
                    <div
                      key={`${evidence.document_id}:${index}`}
                      className="flex flex-col gap-1"
                    >
                      <Button
                        variant="link"
                        className="h-auto justify-start p-0 text-left whitespace-normal"
                        onClick={() => setDocument(doc)}
                      >
                        <FileText data-icon="inline-start" />
                        Abrir {doc.titulo}
                        {evidence.page > 0 ? `, página ${evidence.page}` : ""}
                      </Button>
                      <p className="border-l-2 pl-3 whitespace-pre-wrap">
                        “{evidence.quote}”
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {coverageNote ? <p>{coverageNote}</p> : null}
          </div>
        </details>
      </Alert>
      <PdfDrawer doc={document} onClose={() => setDocument(null)} />
    </>
  );
}
