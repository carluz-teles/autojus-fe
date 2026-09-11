"use client";

import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Files,
  FileText,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import type { PecaContextoDoc } from "../../lib/peca-contexto";

const PREVIEW_COUNT = 4;

export function PreparationSources({
  documents,
  publishedAt,
  hasIntimation,
  onOpenIntimation,
  onOpenDocument,
  actions,
}: {
  documents: PecaContextoDoc[];
  publishedAt?: string;
  hasIntimation: boolean;
  onOpenIntimation: () => void;
  onOpenDocument: (doc: PecaContextoDoc) => void;
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const unique = Array.from(
    new Map(documents.map((doc) => [doc.id, doc])).values(),
  );
  const visible = expanded ? unique : unique.slice(0, PREVIEW_COUNT);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h2>Fontes do processo</h2>
        </CardTitle>
        <CardDescription>
          Consulte os originais sem sair da preparação.
        </CardDescription>
        <CardAction>{actions}</CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="surface-inset overflow-hidden">
          <Button
            variant="ghost"
            className="h-auto min-h-16 w-full justify-start gap-3 px-3 py-3 text-left whitespace-normal"
            disabled={!hasIntimation}
            onClick={onOpenIntimation}
            aria-label="Abrir intimação de origem"
          >
            <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
              <FileText aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-foreground font-medium">
                Intimação de origem
              </span>
              <span className="text-muted-foreground text-xs">
                {hasIntimation
                  ? publishedAt || "Teor da publicação"
                  : "Teor ainda indisponível"}
              </span>
            </span>
            <ArrowUpRight aria-hidden data-icon="inline-end" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Autos e anexos</p>
          <Badge variant="outline">
            {unique.length} {unique.length === 1 ? "documento" : "documentos"}
          </Badge>
        </div>
        {unique.length ? (
          <ul
            id={listId}
            aria-label="Documentos do processo"
            className="max-h-80 overflow-y-auto overscroll-contain rounded-lg border"
          >
            {visible.map((doc) => (
              <li key={doc.id} className="border-b last:border-b-0">
                <Button
                  variant="ghost"
                  className="h-auto min-h-16 w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left whitespace-normal"
                  onClick={() => onOpenDocument(doc)}
                  disabled={doc.status === "PENDING" || doc.status === "FAILED"}
                  aria-label={`Abrir ${doc.name}${doc.meta ? ` — ${doc.meta}` : ""}`}
                >
                  <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                    <FileText aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-foreground line-clamp-2 font-medium wrap-anywhere">
                      {doc.name}
                    </span>
                    <span className="text-muted-foreground line-clamp-2 text-xs wrap-anywhere">
                      {doc.status === "FAILED"
                        ? "Falha no processamento"
                        : doc.status === "PENDING"
                          ? "Aguardando download"
                          : doc.meta || doc.category || "Documento dos autos"}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden data-icon="inline-end" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Files}
            title="Nenhum auto disponível"
            description="Anexe um PDF pelo ícone acima para complementar as fontes."
            className="min-h-0 py-6"
          />
        )}
      </CardContent>
      {unique.length > PREVIEW_COUNT && (
        <CardFooter className="justify-center py-2">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded
              ? "Mostrar menos"
              : `Ver todos os ${unique.length} documentos`}
            {expanded ? (
              <ChevronUp aria-hidden data-icon="inline-end" />
            ) : (
              <ChevronDown aria-hidden data-icon="inline-end" />
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
