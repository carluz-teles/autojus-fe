"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileStack,
  Landmark,
  Loader2,
} from "lucide-react";
import { useState } from "react";

import { ToolbarSearch } from "@/components/shell/list-toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EsajAccess } from "@/features/configuracoes/components/esaj-access";
import {
  useCourtCatalog,
  useCourtConnections,
} from "@/features/configuracoes/hooks/use-court-connections";
import {
  connectionForSystem,
  courtConnectionLabels,
  courtSystemName,
  groupCourtCatalog,
} from "@/features/configuracoes/lib/court-catalog";
import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "@/features/configuracoes/types/court-connection";

import { ConexaoWizard } from "./conexao-wizard";
import { HeroBanner, StatusPill, type Tone } from "./config-kit";

type Selection = { entry: CourtCatalogEntry; connection?: CourtConnectionView };

const ATTENTION = [
  "MFA_REQUIRED",
  "MFA_ENROLLMENT_REQUIRED",
  "REAUTH_REQUIRED",
  "CERTIFICATE_REQUIRED",
  "ERROR",
];

// Uma linha de sistema (eproc/e-SAJ) dentro do card do tribunal. O foco do
// redesign: deixar CLARO o efeito de conectar — subir certificado A1 + 2FA passa a
// IMPORTAR OS AUTOS automaticamente. Cada estado diz o que acontece com os autos.
function SystemRow({
  entry,
  connection,
  onConnect,
}: Selection & { onConnect: () => void }) {
  const perOperation = entry.connection_mode === "PER_OPERATION";
  const authenticating = connection?.status === "AUTHENTICATING";
  const connected =
    !perOperation && entry.available && connection?.status === "CONNECTED";
  const needsAttention =
    !perOperation &&
    entry.available &&
    connection &&
    ATTENTION.includes(connection.status);

  const system = courtSystemName(entry.system);

  // Rótulo curto de status (pílula).
  const statusLabel = !entry.available
    ? "Em preparação"
    : perOperation
      ? "Por operação"
      : connected
        ? "Conectado"
        : authenticating
          ? "Conectando…"
          : connection
            ? courtConnectionLabels[connection.status]
            : "Não conectado";
  const statusTone: Tone = !entry.available
    ? "neutral"
    : connected
      ? "success"
      : needsAttention
        ? "warning"
        : perOperation
          ? "info"
          : "neutral";

  // A frase que ensina o efeito nos AUTOS — coração do pedido.
  const autosMsg = !entry.available
    ? "Integração em preparação — em breve."
    : perOperation
      ? "Acesso por operação (certificado no momento do peticionamento)."
      : connected
        ? "Autos sincronizando automaticamente — nada a baixar."
        : authenticating
          ? "Validando acesso…"
          : needsAttention
            ? "Reconecte (certificado + 2FA) para retomar a importação dos autos."
            : "Conecte com certificado A1 + 2FA e o Atjus importa os autos sozinho.";
  const autosTone = connected
    ? "var(--green)"
    : needsAttention
      ? "var(--gold)"
      : "var(--primary)";

  return (
    <section
      aria-label={`${entry.court} · ${system}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5 first:pt-0 last:pb-0"
    >
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-foreground text-sm font-medium">{system}</h3>
          {entry.scope ? (
            <span className="text-muted-foreground text-xs">{entry.scope}</span>
          ) : null}
          <StatusPill
            label={statusLabel}
            tone={statusTone}
            pulse={authenticating}
          />
        </div>
        <p
          className="mt-1.5 flex items-center gap-1.5 text-xs leading-relaxed"
          style={{ color: autosTone }}
        >
          {connected ? (
            <CheckCircle2 className="size-3.5 flex-none" aria-hidden />
          ) : authenticating ? (
            <Loader2 className="size-3.5 flex-none animate-spin" aria-hidden />
          ) : entry.available && !perOperation ? (
            <FileStack className="size-3.5 flex-none" aria-hidden />
          ) : null}
          {autosMsg}
        </p>
      </div>

      <div className="flex max-w-full flex-wrap items-center gap-2">
        {entry.available ? (
          perOperation ? (
            <EsajAccess court={entry.court} />
          ) : (
            <Button
              size="sm"
              variant={connected ? "outline" : "default"}
              disabled={authenticating}
              onClick={onConnect}
              className="pointer-coarse:min-h-11"
              aria-label={`${connected ? "Ver conexão" : "Conectar"} ${system} · ${entry.court}`}
            >
              {connected
                ? "Ver conexão"
                : authenticating
                  ? "Conectando…"
                  : needsAttention
                    ? "Retomar conexão"
                    : "Conectar e importar autos"}
            </Button>
          )
        ) : (
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            className="pointer-coarse:min-h-11"
            render={
              <a href={entry.source_url} target="_blank" rel="noreferrer" />
            }
            aria-label={`Fonte oficial sobre ${system} no ${entry.court}`}
          >
            Fonte oficial
            <ExternalLink data-icon="inline-end" aria-hidden />
          </Button>
        )}
      </div>
    </section>
  );
}

export function ConfigTribunais() {
  const catalog = useCourtCatalog();
  const connections = useCourtConnections();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selection | null>(null);
  const groups = groupCourtCatalog(catalog.data?.data ?? [], search);
  const multipleCourts =
    new Set((catalog.data?.data ?? []).map((entry) => entry.court)).size > 1;

  const anyConnected = (connections.data ?? []).some(
    (c) => c.status === "CONNECTED",
  );

  return (
    <div className="flex flex-col gap-4">
      <HeroBanner
        icon={<FileStack className="size-[18px]" strokeWidth={1.9} />}
        title={
          anyConnected
            ? "Autos importando automaticamente"
            : "Conecte um tribunal e receba os autos sozinho"
        }
        tone={anyConnected ? "success" : "primary"}
      >
        Suba seu <strong>certificado A1</strong> e confirme o{" "}
        <strong>2FA</strong> uma única vez. A partir daí o Atjus sincroniza os
        autos dos seus processos automaticamente — sem baixar PDF a PDF. As
        publicações já chegam pelo DJEN só com a OAB; os autos exigem essa
        conexão.
      </HeroBanner>

      {multipleCourts ? (
        <ToolbarSearch
          search={search}
          onSearch={setSearch}
          searchLabel="Buscar tribunal ou sistema"
          placeholder="Buscar tribunal, estado ou sistema…"
        />
      ) : null}

      {catalog.isError || connections.isError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Não foi possível carregar os tribunais</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              disabled={catalog.isFetching || connections.isFetching}
              onClick={() => {
                void catalog.refetch();
                void connections.refetch();
              }}
              className="pointer-coarse:min-h-11"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : catalog.isPending || connections.isPending ? (
        <p
          role="status"
          className="text-muted-foreground py-6 text-center text-sm"
        >
          Carregando tribunais…
        </p>
      ) : (
        <>
          <div className="reveal-stagger flex flex-col gap-3">
            {groups.map((group) => {
              const groupConnected = group.systems.some((entry) => {
                const c = connectionForSystem(entry, connections.data ?? []);
                return (
                  entry.connection_mode !== "PER_OPERATION" &&
                  c?.status === "CONNECTED"
                );
              });
              return (
                <div
                  key={group.court}
                  role="region"
                  aria-labelledby={`court-${group.court}`}
                  className="surface-panel relative overflow-hidden"
                >
                  {/* barra de acento (verde se algo conectado, senão marca) */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{
                      background: groupConnected
                        ? "var(--green)"
                        : "linear-gradient(180deg, var(--primary), var(--gold))",
                    }}
                  />
                  <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
                    <span
                      className="grid size-7 flex-none place-items-center rounded-lg"
                      style={{
                        background:
                          "color-mix(in oklch, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <Landmark
                        className="size-4"
                        aria-hidden
                        strokeWidth={1.9}
                      />
                    </span>
                    <h2 id={`court-${group.court}`} className="min-w-0 text-sm">
                      <span className="font-medium">{group.court}</span>
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {group.name}
                      </span>
                    </h2>
                  </div>
                  <div className="divide-border divide-y px-4">
                    {group.systems.map((entry) => (
                      <SystemRow
                        key={entry.system}
                        entry={entry}
                        connection={connectionForSystem(
                          entry,
                          connections.data ?? [],
                        )}
                        onConnect={() =>
                          setSelected({
                            entry,
                            connection: connectionForSystem(
                              entry,
                              connections.data ?? [],
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {!groups.length ? (
              <div
                role="status"
                className="flex flex-col items-center gap-3 py-8"
              >
                <p className="text-muted-foreground text-sm">
                  Nenhum tribunal encontrado.
                </p>
                {search ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearch("")}
                    className="pointer-coarse:min-h-11"
                  >
                    Limpar busca
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Cada sistema tem seu próprio acesso: conectar o eproc de um tribunal
            não conecta o e-SAJ. Integrações em preparação ainda não podem ser
            conectadas.
          </p>
        </>
      )}

      {selected ? (
        <ConexaoWizard
          key={
            selected.connection?.id ??
            `${selected.entry.court}:${selected.entry.system}`
          }
          aberto
          court={selected.entry.court}
          existingConnection={selected.connection}
          onFechar={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
