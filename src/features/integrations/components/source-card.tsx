import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  type Integration,
  type SourceCatalogEntry,
  type SourceKind,
  STATUS_ACTIVE,
} from "../types";

// Apresentacional: um card por fonte do catálogo. Sem hooks — o panel resolve os
// dados (integração ativa, importação em andamento, última reconciliação) e passa
// tudo por prop. As fontes não-ativáveis também viram card: DATAJUD explica o
// enriquecimento automático e UPLOAD comunica o roadmap.

const KIND_LABELS: Record<SourceKind, string> = {
  discovery: "Descoberta",
  enrichment: "Enriquecimento",
  upcoming: "Em breve",
};

function KindChip({ kind }: { kind: SourceKind }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        kind === "discovery" && "bg-primary/10 text-primary",
        kind === "enrichment" && "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        kind === "upcoming" && "bg-muted text-muted-foreground",
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

// Dot de status com pulso quando há atividade (importando). Cor + texto sempre
// juntos (nunca só cor).
function StatusDot({
  tone,
  pulse,
  label,
}: {
  tone: "emerald" | "amber" | "muted";
  pulse?: boolean;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className="relative flex size-2">
        {pulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              tone === "amber" && "bg-amber-500",
              tone === "emerald" && "bg-emerald-500",
            )}
          />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            tone === "emerald" && "bg-emerald-500",
            tone === "amber" && "bg-amber-500",
            tone === "muted" && "bg-muted-foreground/40",
          )}
        />
      </span>
      <span
        className={cn(
          tone === "emerald" && "text-emerald-700 dark:text-emerald-400",
          tone === "amber" && "text-amber-700 dark:text-amber-500",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function SourceCard({
  entry,
  integration,
  importing,
  footer,
  termsHref,
}: {
  entry: SourceCatalogEntry;
  integration?: Integration;
  /** true enquanto o backfill desta fonte está em andamento. */
  importing?: boolean;
  /** Linha de rodapé (ex.: "Última reconciliação há 2 h — 12 novos itens"). */
  footer?: string;
  /** Link "Gerenciar termos" (fontes de descoberta — o scope mora em /settings/termos). */
  termsHref?: string;
}) {
  const active = integration?.status === STATUS_ACTIVE;
  const oab = integration?.scope.oab ?? [];

  const status =
    // upcoming: o chip "Em breve" já diz tudo — sem dot redundante.
    entry.kind === "upcoming" ? null : entry.kind === "enrichment" ? (
      <StatusDot tone="emerald" label="Automática" />
    ) : importing ? (
      <StatusDot tone="amber" pulse label="Importando…" />
    ) : active ? (
      <StatusDot tone="emerald" label="Ativa" />
    ) : (
      <StatusDot tone="muted" label="Não configurada" />
    );

  return (
    <Card
      className={cn(
        "flex flex-col",
        entry.kind === "upcoming" && "bg-card/40 border-dashed shadow-none",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base tracking-tight">
                {entry.name}
              </h3>
              <KindChip kind={entry.kind} />
            </div>
            <p className="text-muted-foreground text-xs">{entry.fullName}</p>
          </div>
          {status}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {entry.description}
        </p>

        {entry.kind === "discovery" ? (
          <div className="flex flex-col gap-2">
            {oab.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {oab.map((reg) => (
                  <span
                    key={reg}
                    className="bg-muted/50 rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums"
                  >
                    {reg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma OAB monitorada nesta fonte.
              </p>
            )}
            {termsHref ? (
              <Link
                href={termsHref}
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
              >
                Gerenciar termos
                <ArrowRight className="size-3" />
              </Link>
            ) : null}
          </div>
        ) : null}

        {footer ? (
          <p className="text-muted-foreground mt-auto border-t pt-3 text-xs">
            {footer}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
