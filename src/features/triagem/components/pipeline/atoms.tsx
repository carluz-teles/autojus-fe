"use client";

// Átomos de apresentação da Triagem-pipeline — extraídos do mockup dev/triagem-v2
// e tipados contra o contrato real (PipelineRow). São puros (sem fetch/mutação):
// recebem props derivadas e renderizam. Reusam os tokens do design system
// (font-display serif, font-mono, --gold/--green/--blue, Badge/Checkbox do DS).

import { Clock, TriangleAlert, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  IntimacaoEstado,
  IntimacaoEstadoTone,
} from "../../../intimacoes/lib/estado";
import type { IntimacaoCategoriaCoarse } from "../../../intimacoes/types";
import type { PipelinePrazo } from "../../lib/pipeline";

export function iniciais(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/** Avatar compacto do responsável (20px) ou traço tracejado "sem responsável". */
export function RespAvatar({ nome }: { nome: string | null }) {
  return (
    <span className="shrink-0" aria-hidden title={nome ?? "Sem responsável"}>
      {nome ? (
        <span className="bg-primary/12 text-primary grid size-5 place-items-center rounded-full text-[0.55rem] font-semibold">
          {iniciais(nome)}
        </span>
      ) : (
        <span className="border-line text-fg3 grid size-5 place-items-center rounded-full border border-dashed">
          <UserRound className="size-3" />
        </span>
      )}
    </span>
  );
}

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

/** Pill compacta de prazo — data curta + relativo; cor por urgência; hint
 *  provisório (*) e dual date interno. */
export function PrazoBadge({ prazo }: { prazo: PipelinePrazo }) {
  if (prazo.tone === "sem-prazo") {
    return (
      <span className="text-fg3 inline-flex shrink-0 items-center gap-1 text-[11px]">
        <Clock className="size-3" aria-hidden />
        sem prazo
      </span>
    );
  }
  const cls =
    prazo.tone === "vencido"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : prazo.tone === "urgente"
        ? "border-gold/35 bg-gold/10 text-gold-foreground"
        : "border-border bg-transparent text-muted-foreground";
  const internoTitle = prazo.internoCurto
    ? ` · interno ${prazo.internoCurto}`
    : "";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium tabular-nums",
        cls,
      )}
      title={
        prazo.fatalLongo
          ? `vence ${prazo.fatalLongo}${internoTitle}${prazo.provisorio ? " (provisório)" : ""}`
          : undefined
      }
    >
      <Clock className="size-3" aria-hidden />
      {prazo.fatalCurto} · {prazo.relativo}
      {prazo.provisorio ? "*" : ""}
      {prazo.internoCurto ? (
        <span className="text-fg3 ml-0.5 font-normal">
          int. {prazo.internoCurto}
        </span>
      ) : null}
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

const ESTADO_COR: Record<IntimacaoEstadoTone, string> = {
  pending: "var(--gold)",
  progress: "var(--blue)",
  done: "var(--green)",
  muted: "var(--fg3)",
};

/** Chip de estado (desfecho) — reusa a fonte única estadoIntimacao (estado.ts). */
export function EstadoChip({ estado }: { estado: IntimacaoEstado }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: estado.cor, backgroundColor: estado.fundo }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: estado.cor }}
        aria-hidden
      />
      {estado.label}
    </span>
  );
}

export { ESTADO_COR };
