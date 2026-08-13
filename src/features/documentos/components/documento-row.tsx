"use client";

import { Download, FileText, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

import { humanSize, originLabel, statusLabel } from "../lib/labels";
import type { DocumentView } from "../types";

// Linha da aba Documentos — só JSX + binding. As ações (baixar/excluir) vêm prontas do
// hook público; aqui apenas ligamos ao id. Excluir só aparece em UPLOAD (COURT = dos autos,
// nunca apagável). O selo de origem separa peso probatório de anexo do advogado.
export function DocumentoRow({
  doc,
  onBaixar,
  onExcluir,
  baixando,
  excluindo,
}: {
  doc: DocumentView;
  onBaixar: (id: string) => void;
  onExcluir: (id: string) => void;
  baixando: boolean;
  excluindo: boolean;
}) {
  const status = statusLabel(doc.status);
  // Só dá para baixar depois que os bytes subiram (PENDING ainda não tem storage).
  const podeBaixar = doc.status !== "PENDING";

  return (
    <div className="hover:bg-muted/30 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors">
      <FileText className="text-muted-foreground size-5 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{doc.title}</span>
          <Badge
            variant="outline"
            className="border-border text-muted-foreground shrink-0 text-xs"
          >
            {originLabel(doc.origin)}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          <StatusBadge label={status.label} tone={status.tone} />
          {doc.pages ? <span>{doc.pages} pág.</span> : null}
          <span>{humanSize(doc.size_bytes)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Baixar documento"
          disabled={!podeBaixar || baixando}
          onClick={() => onBaixar(doc.id)}
        >
          {baixando ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
        {doc.origin === "UPLOAD" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir documento"
            className="text-muted-foreground hover:text-destructive"
            disabled={excluindo}
            onClick={() => onExcluir(doc.id)}
          >
            {excluindo ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
