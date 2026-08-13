"use client";

import { CircleAlert, ExternalLink, Info } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  PrazoAgendaView,
  PrazoCounting,
  PrazoStatus,
  PrazoView,
} from "../types";

// ── Rótulos e cálculos (fora do JSX: componente = binding; lógica em helpers) ──

// "kind" legível: mapa dos tipos conhecidos + humanização de fallback, para que
// qualquer valor do BE apareça de forma apresentável.
const KIND_LABEL: Record<string, string> = {
  APPEAL: "Recurso",
  APPEAL_REPLY: "Contrarrazões",
  ANSWER: "Contestação",
  DEFENSE: "Defesa",
  EMBARGOS: "Embargos",
  MANIFESTATION: "Manifestação",
  COMPLIANCE: "Cumprimento",
  PAYMENT: "Pagamento",
  APPEAL_INNER: "Agravo interno",
};

function humanize(raw: string): string {
  if (!raw) return "Prazo";
  const spaced = raw.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? humanize(kind);
}

const STATUS_LABEL: Record<PrazoStatus, string> = {
  PENDING: "Aguardando",
  OPEN: "Em aberto",
  MET: "Cumprido",
  MISSED: "Perdido",
  CANCELLED: "Cancelado",
};

const COUNTING_LABEL: Record<PrazoCounting, string> = {
  BUSINESS: "dias úteis",
  CALENDAR: "dias corridos",
};

// Tom visual do prazo — reúne status e days_left numa única decisão de estilo.
type PrazoTone = "urgent" | "upcoming" | "met" | "missed" | "cancelled";

function prazoTone(p: PrazoView): PrazoTone {
  if (p.status === "CANCELLED") return "cancelled";
  if (p.status === "MET") return "met";
  if (p.status === "MISSED" || p.days_left < 0) return "missed";
  if (p.days_left < 3) return "urgent"; // < 3 dias = latão/urgente
  return "upcoming";
}

// Contagem regressiva a partir de days_left (negativo = vencido, 0 = hoje).
function countdown(days_left: number): { value: string; unit: string } {
  if (days_left === 0) return { value: "Hoje", unit: "vence hoje" };
  const abs = Math.abs(days_left);
  const dias = abs === 1 ? "dia" : "dias";
  return days_left < 0
    ? { value: String(abs), unit: `${dias} em atraso` }
    : { value: String(abs), unit: `${dias} restantes` };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function hasProcesso(p: PrazoView | PrazoAgendaView): p is PrazoAgendaView {
  return "cnj_number" in p;
}

// Classes do número da contagem por tom (o resto do cartão herda o mesmo tom).
const COUNTDOWN_TONE: Record<PrazoTone, string> = {
  urgent: "text-gold",
  upcoming: "text-foreground",
  met: "text-emerald-600 dark:text-emerald-400",
  missed: "text-destructive",
  cancelled: "text-muted-foreground",
};

const CARD_TONE: Record<PrazoTone, string> = {
  urgent: "border-gold/40 bg-gold/[0.04]",
  upcoming: "",
  met: "",
  missed: "border-destructive/30 bg-destructive/[0.03]",
  cancelled: "opacity-70",
};

// ── Badge de status ──

function StatusBadge({ status }: { status: PrazoStatus }) {
  if (status === "MET") {
    return (
      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        {STATUS_LABEL.MET}
      </Badge>
    );
  }
  const variant =
    status === "MISSED"
      ? "destructive"
      : status === "OPEN"
        ? "default"
        : status === "CANCELLED"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}

// ── Cartão de prazo ──

/**
 * Cartão de um vencimento: contagem regressiva (latão quando < 3 dias), data de
 * fim em pt-BR, badges de contagem/em-dobro/status, disclosure "por quê" com os
 * feriados aplicados e link para a intimação de origem. Serve a aba do processo
 * (PrazoView) e a agenda (PrazoAgendaView — mostra também CNJ/tribunal).
 * `featured` renderiza o herói "próximo prazo" no topo do processo.
 */
export function PrazoCard({
  prazo,
  featured = false,
}: {
  prazo: PrazoView | PrazoAgendaView;
  featured?: boolean;
}) {
  const tone = prazoTone(prazo);
  const { value, unit } = countdown(prazo.days_left);
  const agenda = hasProcesso(prazo) ? prazo : null;

  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors",
        CARD_TONE[tone],
        featured && "border-gold/50 bg-gold/[0.06] ring-gold/20 ring-1",
      )}
    >
      {featured ? (
        <span className="text-gold text-xs font-medium tracking-wide uppercase">
          Próximo prazo
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="leading-snug font-medium">{kindLabel(prazo.kind)}</h3>
          {agenda ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs tabular-nums">
              {agenda.cnj_number}
              {agenda.court ? ` · ${agenda.court}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <StatusBadge status={prazo.status} />
          {!prazo.confirmed ? (
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
              title="Prazo derivado da intimação, ainda não confirmado por um humano."
            >
              <CircleAlert /> A confirmar
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div
            className={cn(
              "font-display leading-none tabular-nums",
              featured ? "text-4xl" : "text-3xl",
              COUNTDOWN_TONE[tone],
            )}
          >
            {value}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">{unit}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-medium tabular-nums">
            {fmtDate(prazo.end_date)}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Badge variant="outline">{COUNTING_LABEL[prazo.counting]}</Badge>
            {prazo.doubled ? (
              <Badge
                variant="secondary"
                title={prazo.doubled_reason || "Prazo em dobro"}
              >
                Em dobro
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <PrazoPorQue prazo={prazo} />
    </article>
  );
}

// Disclosure "por quê": como o prazo foi contado. Nativo (<details>) — sem
// dependência de popover; teclado/acessibilidade de graça.
function PrazoPorQue({ prazo }: { prazo: PrazoView | PrazoAgendaView }) {
  return (
    <details className="group border-t pt-3 text-xs">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 outline-none">
        <Info className="size-3.5" />
        <span>Por quê?</span>
      </summary>
      <div className="text-muted-foreground mt-2 flex flex-col gap-1.5 leading-relaxed">
        <p>
          Contado em <strong>{COUNTING_LABEL[prazo.counting]}</strong> no
          calendário forense.
        </p>
        {prazo.doubled ? (
          <p>
            Prazo <strong>em dobro</strong>
            {prazo.doubled_reason ? `: ${prazo.doubled_reason}` : "."}
          </p>
        ) : null}
        {prazo.holidays_applied.length > 0 ? (
          <p>
            Feriados/suspensões aplicados:{" "}
            <span className="text-foreground/80">
              {prazo.holidays_applied.join(", ")}
            </span>
          </p>
        ) : null}
        {prazo.intimation_id ? (
          <Link
            href={`/intimacoes/${prazo.intimation_id}`}
            className="text-gold inline-flex w-fit items-center gap-1 hover:underline"
          >
            <ExternalLink className="size-3.5" /> Ver intimação de origem
          </Link>
        ) : null}
      </div>
    </details>
  );
}

// Skeleton de carregamento — mesma silhueta do cartão.
export function PrazoCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="bg-muted h-9 w-16 animate-pulse rounded" />
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-3 w-16 animate-pulse rounded" />
    </div>
  );
}
