"use client";

// Átomos de apresentação da Triagem-pipeline — extraídos do mockup dev/triagem-v2
// e tipados contra o contrato real (PipelineRow). São puros (sem fetch/mutação):
// recebem props derivadas e renderizam. Reusam os tokens do design system
// (font-display serif, font-mono, --gold/--green/--blue, Badge/Checkbox do DS).

import { Clock, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import type { IntimacaoCategoriaCoarse } from "../../../intimacoes/types";
import type { PipelinePrazo } from "../../lib/pipeline";

/** Chip grosso da categoria coarse — pequeno, neutro/outline. */
export function CategoriaChip({
  categoria,
  label,
}: {
  categoria: IntimacaoCategoriaCoarse;
  label: string;
}) {
  return (
    <span
      data-categoria={categoria}
      className="border-border/80 bg-muted/50 text-muted-foreground shrink-0 rounded px-1.5 py-px text-[10px] font-medium tracking-wide uppercase"
    >
      {label}
    </span>
  );
}

/**
 * Prazo em DESTAQUE — a âncora visual da linha da Mesa (redesign da linha, docs
 * §4; ui-ux-pro-max §5 visual-hierarchy + §6 number-tabular). Bloco tonalizado
 * por urgência: data fatal grande e tabular no topo, relativo + prazo interno
 * embaixo. Recebe PipelinePrazo, fonte única de datas e tom da linha.
 */
export function PrazoDestaque({
  prazo,
  dense = false,
}: {
  prazo: PipelinePrazo;
  /** Compacto: pílula de UMA linha (mesma info, menos altura), para a densidade
   *  "compacto" da lista. Padrão: bloco de duas linhas com a data em destaque. */
  dense?: boolean;
}) {
  if (prazo.tone === "sem-prazo") {
    return (
      <span className="text-fg3 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-[12px]">
        <Clock className="size-3.5" aria-hidden />
        Sem prazo
      </span>
    );
  }
  const cls =
    prazo.tone === "vencido"
      ? "border-destructive/30 bg-destructive/8 text-destructive"
      : prazo.tone === "urgente"
        ? "border-gold/35 bg-gold/10 text-gold-foreground"
        : "border-border bg-card text-foreground/80";
  const internoTitle = prazo.internoCurto
    ? ` · interno ${prazo.internoCurto}`
    : "";
  const title = prazo.fatalLongo
    ? `vence ${prazo.fatalLongo}${internoTitle}${prazo.provisorio ? " (provisório)" : ""}`
    : undefined;

  if (dense) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium tabular-nums",
          cls,
        )}
        title={title}
      >
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span className="font-semibold">
          {prazo.fatalCurto}
          {prazo.provisorio ? "*" : ""}
        </span>
        <span className="opacity-80">· {prazo.relativo}</span>
        {prazo.internoCurto ? (
          <span className="opacity-60">· int. {prazo.internoCurto}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-2.5 py-1",
        cls,
      )}
      title={title}
    >
      <Clock className="size-4 shrink-0" aria-hidden />
      {/* conteúdo centrado dentro do chip (pedido do usuário) */}
      <span className="flex flex-col items-center text-center leading-none">
        <span className="text-[14px] font-semibold tabular-nums">
          {prazo.fatalCurto}
          {prazo.provisorio ? "*" : ""}
        </span>
        <span className="mt-0.5 text-[10.5px] font-medium tabular-nums opacity-80">
          {prazo.relativo}
          {prazo.internoCurto ? ` · int. ${prazo.internoCurto}` : ""}
        </span>
      </span>
    </span>
  );
}

/** Marca de exceção — triângulo âmbar; tooltip com o motivo. */
export function ExcecaoDot({ motivo }: { motivo?: string }) {
  return (
    <span
      className="text-gold-foreground inline-flex shrink-0 items-center"
      title={motivo ?? "Precisa de revisão"}
      aria-label={`Exceção: ${motivo ?? "precisa de revisão"}`}
    >
      <TriangleAlert className="size-3.5" aria-hidden />
    </span>
  );
}
