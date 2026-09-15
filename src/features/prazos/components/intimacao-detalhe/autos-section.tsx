"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { DetailCard } from "@/components/shell/detail-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type OpenDocument,
  PdfDrawer,
} from "@/features/documentos/components/pdf-drawer";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";
import { rotuloTipoAuto } from "@/features/documentos/lib/tipo-autos";

/**
 * Autos do processo dentro do detalhe da intimação — parte do "ter tudo" na
 * unidade de trabalho. Reaproveita o hook de documentos do processo e o
 * visualizador (PdfDrawer) já usado no cockpit; não reimplementa a listagem.
 */
export function AutosSection({ processId }: { processId: string }) {
  const autos = useDocumentosDoProcesso(processId);
  const [aberto, setAberto] = useState<OpenDocument | null>(null);

  return (
    <DetailCard id="autos-intimacao" className="scroll-mt-6">
      <CardHeader>
        <CardTitle>
          <h2>Autos do processo</h2>
        </CardTitle>
        <CardDescription>
          Consulte os documentos do processo sem sair da intimação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {autos.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : autos.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm">
              Não foi possível carregar os autos.
            </p>
            <Button variant="outline" size="sm" onClick={() => autos.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : autos.isEmpty ? (
          <p className="text-muted-foreground text-sm">
            Os autos ainda não estão disponíveis para este processo.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {autos.documentos.map((doc) => {
              const nome = rotuloTipoAuto(doc.document_type) || doc.title;
              const meta = [
                doc.title,
                doc.pages ? `${doc.pages} pág.` : "",
                doc.origin === "UPLOAD" ? "Anexo do escritório" : "Autos",
              ]
                .filter(Boolean)
                .join(" · ");
              const pronto = doc.status === "READY";
              return (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                      <FileText className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{nome}</p>
                      <p className="text-muted-foreground text-xs break-words">
                        {meta}
                      </p>
                    </div>
                  </div>
                  {pronto ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAberto({ id: doc.id, titulo: nome, meta })
                      }
                      aria-label={`Abrir ${nome}`}
                    >
                      Abrir documento
                    </Button>
                  ) : (
                    <Badge variant="secondary">Processando…</Badge>
                  )}
                </div>
              );
            })}
            {autos.hasNextPage ? (
              <div className="pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={autos.isFetchingNextPage}
                  onClick={() => autos.fetchNextPage()}
                >
                  {autos.isFetchingNextPage
                    ? "Carregando…"
                    : "Mostrar mais autos"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
      <PdfDrawer doc={aberto} onClose={() => setAberto(null)} />
    </DetailCard>
  );
}
