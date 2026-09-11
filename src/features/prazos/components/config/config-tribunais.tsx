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

type Selection = { entry: CourtCatalogEntry; connection?: CourtConnectionView };

function SystemRow({
  entry,
  connection,
  onConnect,
}: Selection & { onConnect: () => void }) {
  const perOperation = entry.connection_mode === "PER_OPERATION";
  const connected =
    !perOperation && entry.available && connection?.status === "CONNECTED";
  const needsAttention =
    !perOperation &&
    entry.available &&
    connection &&
    [
      "MFA_REQUIRED",
      "MFA_ENROLLMENT_REQUIRED",
      "REAUTH_REQUIRED",
      "CERTIFICATE_REQUIRED",
      "ERROR",
    ].includes(connection.status);
  const status = !entry.available
    ? "Em preparação"
    : perOperation
      ? "Acesso por operação"
      : connection
        ? courtConnectionLabels[connection.status]
        : "Não conectado";
  const system = courtSystemName(entry.system);
  const actions = (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {entry.available ? (
        perOperation ? (
          <EsajAccess court={entry.court} />
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={connection?.status === "AUTHENTICATING"}
            onClick={onConnect}
            className="pointer-coarse:min-h-11"
            aria-label={`${connected ? "Ver conexão" : "Conectar"} ${system} · ${entry.court}`}
          >
            {connected
              ? "Ver conexão"
              : connection?.status === "AUTHENTICATING"
                ? "Conectando…"
                : needsAttention
                  ? "Retomar conexão"
                  : "Conectar"}
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
  );
  const description = (
    <div className="min-w-0 flex-1 basis-56">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-foreground text-sm font-medium">{system}</h3>
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
      {entry.available && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {perOperation
            ? "Certificado A1 · 2FA se solicitado pelo portal."
            : "Certificado A1 e segundo fator (2FA)."}
        </p>
      )}
    </div>
  );
  return (
    <section
      aria-label={`${entry.court} · ${system}`}
      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {description}
        {actions}
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
  // Busca só faz sentido com mais de um tribunal no catálogo (hoje só TJSP).
  const multipleCourts =
    new Set((catalog.data?.data ?? []).map((entry) => entry.court)).size > 1;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Cada sistema tem seu próprio acesso. Conectar o eproc de um tribunal não
        conecta o e-SAJ.
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
              <Card
                key={group.court}
                size="sm"
                role="region"
                aria-labelledby={`court-${group.court}`}
              >
                <CardHeader>
                  <CardTitle id={`court-${group.court}`}>
                    <div className="flex items-center gap-2">
                      <Landmark
                        className="text-primary size-4 shrink-0"
                        aria-hidden
                      />
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
                  {group.systems.map((entry) => {
                    const connection = connectionForSystem(
                      entry,
                      connections.data ?? [],
                    );
                    return (
                      <SystemRow
                        key={entry.system}
                        entry={entry}
                        connection={connection}
                        onConnect={() => setSelected({ entry, connection })}
                      />
                    );
                  })}
                </CardContent>
              </Card>
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
          key={
            selected.connection?.id ??
            `${selected.entry.court}:${selected.entry.system}`
          }
          aberto
          court={selected.entry.court}
          existingConnection={selected.connection}
          onFechar={() => setSelected(null)}
        />
      )}
    </div>
  );
}
