"use client";

import { Landmark, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useConnectCourtConnection,
  useCourtConnections,
} from "@/features/configuracoes/hooks/use-court-connections";
import type {
  CourtConnectionStatus,
  CourtConnectionView,
} from "@/features/configuracoes/types/court-connection";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import { ConexaoWizard } from "./conexao-wizard";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

// Rótulo + cores do status (mesma paleta dos badges de certificado).
function statusVM(status: CourtConnectionStatus): {
  label: string;
  fundo: string;
  cor: string;
} {
  const ok = {
    fundo: "color-mix(in oklch, var(--primary) 12%, transparent)",
    cor: "var(--primary)",
  };
  const warn = {
    fundo: "color-mix(in oklch, var(--gold) 16%, transparent)",
    cor: "var(--gold)",
  };
  const danger = {
    fundo: "color-mix(in oklch, var(--destructive) 12%, transparent)",
    cor: "var(--destructive)",
  };
  const neutral = { fundo: "var(--hover)", cor: "var(--fg3)" };
  switch (status) {
    case "CONNECTED":
      return { label: "Conectado", ...ok };
    case "AUTHENTICATING":
      return { label: "Conectando…", ...neutral };
    case "MFA_ENROLLMENT_REQUIRED":
      return { label: "Falta o segundo fator", ...warn };
    case "MFA_REQUIRED":
    case "REAUTH_REQUIRED":
      return { label: "Precisa reconectar", ...warn };
    case "CERTIFICATE_REQUIRED":
      return { label: "Certificado pendente", ...warn };
    case "ERROR":
      return { label: "Erro", ...danger };
    default:
      return { label: "Desconectado", ...neutral };
  }
}

// Aba "Tribunais" (Configurações): conexões eproc para ler os autos
// automaticamente. Certificado + segundo fator capturado uma única vez.
export function ConfigTribunais() {
  const { data: conexoes, isLoading, error } = useCourtConnections();
  const connectMut = useConnectCourtConnection();
  const [aberto, setAberto] = useState(false);

  async function reconectar(c: CourtConnectionView) {
    try {
      await connectMut.mutateAsync(c.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <div className="mb-3.5 flex items-start justify-between gap-4">
        <p className="text-fg3 text-[12.5px]">
          Conecte-se ao tribunal para ler os autos automaticamente. Usa o seu
          certificado e um segundo fator capturado uma única vez.
        </p>
        <button
          onClick={() => setAberto(true)}
          className="bg-primary text-primary-foreground inline-flex flex-none items-center gap-[7px] rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium"
        >
          <Plus className="size-3.5" strokeWidth={2} />
          Conectar tribunal
        </button>
      </div>

      {error ? (
        <p className="text-destructive text-[12.5px]">
          Não foi possível carregar as conexões.
        </p>
      ) : (
        <div className="border-line bg-panel overflow-hidden rounded-xl border">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="border-line2 flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
              >
                <span className="bg-hover size-[18px] flex-none animate-pulse rounded" />
                <span className="min-w-0 flex-1">
                  <span className="bg-hover mb-1.5 block h-3 w-32 animate-pulse rounded" />
                  <span className="bg-hover block h-2.5 w-44 animate-pulse rounded" />
                </span>
              </div>
            ))
          ) : (conexoes?.length ?? 0) === 0 ? (
            <div className="text-fg3 px-4 py-8 text-center text-[12.5px]">
              Nenhum tribunal conectado ainda.
            </div>
          ) : (
            conexoes!.map((c) => {
              const vm = statusVM(c.status);
              const podeReconectar =
                c.status !== "CONNECTED" && c.status !== "AUTHENTICATING";
              return (
                <div
                  key={c.id}
                  className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <Landmark
                    className="text-primary size-[18px] flex-none"
                    strokeWidth={1.7}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      {c.court} · {c.system}
                    </span>
                    <span className="text-fg3 block text-[11.5px]">
                      {c.last_authenticated_at
                        ? `Última conexão em ${formatDate(c.last_authenticated_at)}`
                        : "Nunca conectado"}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={{ background: vm.fundo, color: vm.cor }}
                  >
                    {vm.label}
                  </span>
                  {podeReconectar && (
                    <button
                      onClick={() => reconectar(c)}
                      disabled={connectMut.isPending}
                      className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50"
                    >
                      Reconectar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <ConexaoWizard aberto={aberto} onFechar={() => setAberto(false)} />
    </>
  );
}
