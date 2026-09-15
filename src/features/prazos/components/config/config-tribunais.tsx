"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Landmark,
} from "lucide-react";
import { useState } from "react";

import { ToolbarSearch } from "@/components/shell/list-toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

const ATTENTION_STATUSES = [
  "MFA_REQUIRED",
  "MFA_ENROLLMENT_REQUIRED",
  "REAUTH_REQUIRED",
  "CERTIFICATE_REQUIRED",
  "ERROR",
];

type TribunalGrupo = {
  court: string;
  name: string;
  systems: CourtCatalogEntry[];
};

type Selection = {
  court: string;
  name: string;
  entries: CourtCatalogEntry[];
};

/** Linha de um sistema dentro do card do tribunal — nome, escopo e status. */
function SystemRow({
  entry,
  connection,
}: {
  entry: CourtCatalogEntry;
  connection?: CourtConnectionView;
}) {
  const perOperation = entry.connection_mode === "PER_OPERATION";
  const connected =
    !perOperation && entry.available && connection?.status === "CONNECTED";
  const needsAttention =
    !perOperation &&
    entry.available &&
    connection &&
    ATTENTION_STATUSES.includes(connection.status);
  const status = !entry.available
    ? "Em preparação"
    : perOperation
      ? "Acesso por operação"
      : connection
        ? courtConnectionLabels[connection.status]
        : "Não conectado";
  const system = courtSystemName(entry.system);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-52">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-foreground text-[13px] font-medium">{system}</h4>
          {entry.scope && (
            <span className="text-muted-foreground text-xs">{entry.scope}</span>
          )}
          <Badge
            variant={
              connected ? "success" : needsAttention ? "warning" : "outline"
            }
          >
            {connected && <CheckCircle2 data-icon="inline-start" aria-hidden />}
            {needsAttention && (
              <AlertCircle data-icon="inline-start" aria-hidden />
            )}
            {status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {entry.system === "ESAJ"
            ? "Preparação de peticionamento com peça e anexos."
            : "Consulta e sincronização de autos."}
        </p>
      </div>
      {entry.available ? (
        perOperation ? (
          <EsajAccess court={entry.court} />
        ) : null
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
  );
}

/** Card de um tribunal: sistemas com status + UM botão de conexão unificado. */
function TribunalCard({
  group,
  connections,
  onConnect,
}: {
  group: TribunalGrupo;
  connections: CourtConnectionView[];
  onConnect: (selection: Selection) => void;
}) {
  // Sistemas conectáveis pelo fluxo unificado (disponíveis e persistentes).
  const connectable = group.systems.filter(
    (entry) => entry.available && entry.connection_mode !== "PER_OPERATION",
  );
  const connectedCount = connectable.filter(
    (entry) => connectionForSystem(entry, connections)?.status === "CONNECTED",
  ).length;
  const total = connectable.length;
  const needsAttention = connectable.some((entry) => {
    const c = connectionForSystem(entry, connections);
    return c && ATTENTION_STATUSES.includes(c.status);
  });
  const allConnected = total > 0 && connectedCount === total;
  const resumo =
    total === 0
      ? "Sem sistemas conectáveis no momento."
      : allConnected
        ? total === 1
          ? "Sistema conectado."
          : "Todos os sistemas conectados."
        : connectedCount > 0
          ? `${connectedCount} de ${total} sistemas conectados.`
          : "Nenhum sistema conectado.";

  return (
    <Card size="sm" role="region" aria-labelledby={`court-${group.court}`}>
      <CardHeader>
        <CardTitle id={`court-${group.court}`}>
          <div className="flex items-center gap-2">
            <Landmark className="text-primary size-4 shrink-0" aria-hidden />
            <h2 className="min-w-0">
              <span>{group.court}</span>
              <span className="text-muted-foreground font-normal">
                {" "}
                · {group.name}
              </span>
            </h2>
          </div>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="divide-border divide-y">
        {group.systems.map((entry) => (
          <SystemRow
            key={entry.system}
            entry={entry}
            connection={connectionForSystem(entry, connections)}
          />
        ))}
      </CardContent>
      {total > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {allConnected && (
                <CheckCircle2 className="text-primary size-3.5" aria-hidden />
              )}
              {needsAttention && !allConnected && (
                <AlertCircle className="text-gold size-3.5" aria-hidden />
              )}
              {resumo}
            </p>
            <Button
              size="sm"
              variant={connectedCount > 0 ? "outline" : "default"}
              onClick={() =>
                onConnect({
                  court: group.court,
                  name: group.name,
                  entries: connectable,
                })
              }
              className="pointer-coarse:min-h-11"
              aria-label={`${
                connectedCount > 0 ? "Gerenciar conexões" : "Conectar"
              } ${group.court}`}
            >
              {connectedCount > 0 ? "Gerenciar conexões" : "Conectar"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export function ConfigTribunais() {
  const catalog = useCourtCatalog();
  const connections = useCourtConnections();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selection | null>(null);
  const groups = groupCourtCatalog(catalog.data?.data ?? [], search);
  // Busca só faz sentido com mais de um tribunal no catálogo (hoje só TJSP).
  const multipleCourts =
    new Set((catalog.data?.data ?? []).map((entry) => entry.court)).size > 1;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Um certificado conecta os sistemas do tribunal (eproc e e-SAJ). O
        segundo fator só é pedido quando o portal exige.
      </p>
      {multipleCourts && (
        <ToolbarSearch
          search={search}
          onSearch={setSearch}
          searchLabel="Buscar tribunal ou sistema"
          placeholder="Buscar tribunal, estado ou sistema…"
        />
      )}
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
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <TribunalCard
                key={group.court}
                group={group}
                connections={connections.data ?? []}
                onConnect={setSelected}
              />
            ))}
            {!groups.length && (
              <div
                role="status"
                className="flex flex-col items-center gap-3 py-8"
              >
                <p className="text-muted-foreground text-sm">
                  Nenhum tribunal encontrado.
                </p>
                {search && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearch("")}
                    className="pointer-coarse:min-h-11"
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            A disponibilidade vale para a função e o grau indicados em cada
            sistema. Integrações em preparação ainda não podem ser conectadas.
          </p>
        </>
      )}
      {selected && (
        <ConexaoWizard
          key={selected.court}
          aberto
          court={selected.court}
          courtName={selected.name}
          entries={selected.entries}
          connections={connections.data ?? []}
          onFechar={() => setSelected(null)}
        />
      )}
    </div>
  );
}
