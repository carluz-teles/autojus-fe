import { ExternalLink, FileText } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PecaCitation } from "../types";

export interface CitationLinkProps {
  citation: PecaCitation;
  /** Classes extras de cor/texto passadas pelo contexto (sugestão vs chat). */
  className?: string;
}

/**
 * Link acessível para uma citação documental.
 * Texto completo: "Documento, página N: <trecho>" — lido por screen readers.
 * Visual: ícone + trecho truncado + seta de abertura externa.
 */
export function CitationLink({ citation, className }: CitationLinkProps) {
  const pageLabel = citation.page !== null ? `, página ${citation.page}` : "";
  const accessibleLabel = `Documento${pageLabel}: ${citation.quote}`;

  return (
    <a
      href={`/api/v1/documentos/${citation.document_id}/download`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleLabel}
      className={cn(
        "flex items-center gap-1.5 text-xs hover:underline",
        className,
      )}
    >
      <FileText className="size-3 shrink-0" aria-hidden />
      <span className="line-clamp-1">{citation.quote}</span>
      <ExternalLink
        className="ml-auto size-3 shrink-0 opacity-60"
        aria-hidden
      />
    </a>
  );
}
