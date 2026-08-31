"use client";

import { Landmark, Loader2, Plug, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { Card } from "@/components/mock-ui/layout";
import { StatusBadge,type Tom } from "@/components/mock-ui/status-badge";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import {
  useConnectCourtConnection,
  useCourtConnections,
} from "../hooks/use-court-connections";
import type {
  CourtConnectionStatus,
  CourtConnectionView,
} from "../types/court-connection";
import { CourtConnectionWizard } from "./court-connection-wizard";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

function statusInfo(status: CourtConnectionStatus): {
  tone: Tom;
  label: string;
} {
  switch (status) {
    case "CONNECTED":
      return { tone: "success", label: "Conectado" };
    case "AUTHENTICATING":
      return { tone: "info", label: "Conectando…" };
    case "MFA_ENROLLMENT_REQUIRED":
      return { tone: "warning", label: "Falta o segundo fator" };
    case "MFA_REQUIRED":
    case "REAUTH_REQUIRED":
      return { tone: "warning", label: "Precisa reconectar" };
    case "CERTIFICATE_REQUIRED":
      return { tone: "warning", label: "Certificado pendente" };
    case "ERROR":
      return { tone: "danger", label: "Erro" };
    default:
      return { tone: "neutral", label: "Desconectado" };
  }
}

/**
 * Bloco "Conexões com tribunais" (eproc): lista as conexões do tenant e abre o
 * wizard de conexão (certificado + segundo fator). É o que habilita a leitura
 * automática dos autos — distinto da credencial e-SAJ (protocolo), que fica logo
 * abaixo na mesma aba.
 */
export function CourtConnectionsTab() {
  const { data: conexoes, isLoading, error } = useCourtConnections();
  const connectMut = useConnectCourtConnection();
  const [conectando, setConectando] = useState(false);

  async function reconectar(c: CourtConnectionView) {
    try {
      await connectMut.mutateAsync(c.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex gap-3">
          <Landmark className="text-muted-foreground mt-0.5 size-5" />
          <div className="flex-1">
            <h2 className="font-display text-lg font-medium">
              Conexões com tribunais
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Conecte-se ao tribunal para ler os autos automaticamente. Usa o
              seu certificado + um segundo fator capturado uma única vez.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
            <span className="text-muted-foreground">Carregando conexões…</span>
          </div>
        ) : error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
            <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <span>
              Não foi possível carregar as conexões.{" "}
              {error instanceof ApiError ? error.message : "Tente recarregar."}
            </span>
          </div>
        ) : (conexoes?.length ?? 0) === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-[color-mix(in_oklch,var(--primary)_3%,transparent)] p-5 text-center">
            <p className="text-muted-foreground text-[13px]">
              Nenhum tribunal conectado ainda.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {conexoes!.map((c) => {
              const info = statusInfo(c.status);
              return (
                <li
                  key={c.id}
                  className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium">
                      {c.court} · {c.system}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {c.last_authenticated_at
                        ? `Última conexão em ${formatDate(c.last_authenticated_at)}`
                        : "Nunca conectado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={info.tone} ponto>
                      {info.label}
                    </StatusBadge>
                    {c.status !== "CONNECTED" &&
                      c.status !== "AUTHENTICATING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={connectMut.isPending}
                          onClick={() => reconectar(c)}
                        >
                          Reconectar
                        </Button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <Button variant="outline" onClick={() => setConectando((v) => !v)}>
            <Plug className="mr-1.5 size-4" />
            {conectando ? "Fechar" : "Conectar tribunal"}
          </Button>
        </div>
      </Card>

      {conectando && (
        <CourtConnectionWizard onFechar={() => setConectando(false)} />
      )}
    </div>
  );
}
