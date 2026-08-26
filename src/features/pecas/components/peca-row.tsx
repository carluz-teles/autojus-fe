import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn, formatarData } from "@/lib/utils";

import type { PecaListItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PecaRow — card/linha de uma peça, reusado em IntimacaoDetail (Peças desta
// intimação) e no cockpit do processo (aba Peças). Extraído de
// intimacao-detail.tsx (Regra nº1: uma só fonte de verdade pra este card).
// ─────────────────────────────────────────────────────────────────────────────

export function PecaRow({ peca: p }: { peca: PecaListItem }) {
  return (
    <Link
      href={`/pecas/${p.id}`}
      className="border-border hover:bg-muted/40 mt-3 flex w-full items-center gap-3 border-t py-3.5 text-left transition-colors"
    >
      <span className="text-foreground text-[14px]">
        {rotuloPieceType(p.piece_type)}
      </span>
      <span className="text-foreground text-[14px]">{p.title}</span>
      <StatusBadgePeca status={p.status} />
      {p.coverage_summary?.grounded && (
        <span className="rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--success-foreground)]">
          Fundamentada
        </span>
      )}
      <span className="text-muted-foreground ml-auto text-[12px] tabular-nums">
        {formatarData(p.created_at)}
      </span>
      <ArrowUpRight className="text-muted-foreground size-3.5" strokeWidth={2} />
    </Link>
  );
}

const PIECE_TYPE_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  APPEAL: "Recurso",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

function rotuloPieceType(pieceType: string): string {
  return PIECE_TYPE_LABEL[pieceType] ?? "Peça";
}

const STATUS_PECA_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SIGNED: "Assinada",
  FILED: "Protocolada",
  DISCARDED: "Descartada",
};

export function StatusBadgePeca({ status }: { status: string }) {
  const label = STATUS_PECA_LABEL[status] ?? status;
  const isDraft = status === "DRAFT";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        isDraft
          ? "bg-[color-mix(in_oklch,var(--gold)_15%,transparent)] text-[var(--gold-foreground)]"
          : "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success-foreground)]",
      )}
    >
      {label}
    </span>
  );
}
