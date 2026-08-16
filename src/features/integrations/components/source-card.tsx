import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  type Integration,
  type PortalCredential,
  type SourceCatalogEntry,
  type SourceKind,
  STATUS_ACTIVE,
} from "../types";

// Apresentacional: um card por fonte do catálogo. Sem hooks — o panel resolve os
// dados (integração ativa, importação em andamento, última reconciliação, ou
// credencial de portal) e passa tudo por prop. As fontes não-ativáveis também
// viram card: DATAJUD explica o enriquecimento automático e UPLOAD comunica o
// roadmap. kind="credential" (TJSP eproc) usa `credential` + `action` em vez
// de `integration` — é login/senha pessoal, não ativação por OAB.

const KIND_LABELS: Record<SourceKind, string> = {
  discovery: "Descoberta",
  enrichment: "Enriquecimento",
  upcoming: "Em breve",
  credential: "Credencial",
};

function KindChip({ kind }: { kind: SourceKind }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        kind === "discovery" && "bg-primary/10 text-primary",
        kind === "enrichment" && "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        kind === "upcoming" && "bg-muted text-muted-foreground",
        kind === "credential" &&
          "bg-violet-500/10 text-violet-700 dark:text-violet-400",
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
  tone: "emerald" | "amber" | "destructive" | "muted";
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
            tone === "destructive" && "bg-destructive",
            tone === "muted" && "bg-muted-foreground/40",
          )}
        />
      </span>
      <span
        className={cn(
          tone === "emerald" && "text-emerald-700 dark:text-emerald-400",
          tone === "amber" && "text-amber-700 dark:text-amber-500",
          tone === "destructive" && "text-destructive",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </span>
  );
}

// Deriva o dot de status da credencial de portal a partir do read model do BE.
// null = nunca configurada. AUTH_FAILED/CAPTCHA_BLOCKED usam texto acionável —
// a cor sozinha nunca carrega o significado.
function credentialStatus(credential?: PortalCredential | null) {
  if (!credential) {
    return <StatusDot tone="muted" label="Não configurada" />;
  }
  switch (credential.status) {
    case "ACTIVE":
      return (
        <StatusDot
          tone="emerald"
          label={`Conectado como ${credential.login}`}
        />
      );
    case "AUTH_FAILED":
      return <StatusDot tone="destructive" label="Login ou senha inválidos" />;
    case "CAPTCHA_BLOCKED":
      return (
        <StatusDot tone="amber" label="Bloqueio do portal — tente novamente" />
      );
    case "DISABLED":
      return <StatusDot tone="muted" label="Desativada" />;
  }
}

export function SourceCard({
  entry,
  integration,
  importing,
  footer,
  termsHref,
  credential,
  action,
}: {
  entry: SourceCatalogEntry;
  integration?: Integration;
  /** true enquanto o backfill desta fonte está em andamento. */
  importing?: boolean;
  /** Linha de rodapé (ex.: "Última reconciliação há 2 h — 12 novos itens"). */
  footer?: string;
  /** Link "Gerenciar termos" (fontes de descoberta — o scope mora em /settings/termos). */
  termsHref?: string;
  /** kind="credential": a credencial de portal atual (null = não configurada). */
  credential?: PortalCredential | null;
  /** kind="credential": CTA da credencial ("Configurar"/"Reconfigurar" + "Remover"). */
  action?: React.ReactNode;
}) {
  const active = integration?.status === STATUS_ACTIVE;
  const oab = integration?.scope.oab ?? [];

  const status =
    // upcoming: o chip "Em breve" já diz tudo — sem dot redundante.
    entry.kind === "upcoming" ? null : entry.kind === "credential" ? (
      credentialStatus(credential)
    ) : entry.kind === "enrichment" ? (
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

        {entry.kind === "credential" ? (
          <div className="mt-auto flex flex-col gap-3 border-t pt-3">
            {credential?.status === "ACTIVE" && credential.last_verified_at ? (
              <p className="text-muted-foreground text-xs">
                Última verificação:{" "}
                {formatDateTime(credential.last_verified_at)}
              </p>
            ) : credential?.last_error ? (
              <p className="text-destructive text-xs">
                {credential.last_error}
              </p>
            ) : null}
            {action}
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
