"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { useCourtConnections } from "@/features/configuracoes/hooks/use-court-connections";

import { courtAccess } from "../lib/import-readiness";

/** Reads real connection state; loading/error must never mean disconnected. */
export function CourtAccessNotice({
  court,
  degree,
  onPrepare,
}: {
  court?: string;
  degree?: string;
  onPrepare?: () => void;
}) {
  const query = useCourtConnections();
  if (query.isPending) return null;
  const access = courtAccess(query.data ?? [], court);
  const outsideScope =
    court === "TJSP" && degree && !["G1", "JE"].includes(degree);
  if (!query.isError && !outsideScope && access === "connected") return null;
  const title = outsideScope
    ? "Confira o ambiente deste processo"
    : query.isError
      ? "Não foi possível verificar o acesso aos autos"
      : access === "connecting"
        ? "Conexão com o eproc em andamento"
        : access === "mfa"
          ? "Conclua o segundo fator do eproc"
          : `Acesso ao eproc${court ? ` · ${court}` : ""} não identificado`;
  return (
    <div
      role="status"
      className="border-line bg-panel flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 text-[12px]"
    >
      <AlertCircle className="text-gold size-4 shrink-0" />
      <div className="min-w-0 flex-1 basis-52">
        <p className="font-medium">{title}</p>
        <p className="text-fg3 mt-0.5">
          {outsideScope
            ? "A conexão disponível cobre o eproc de 1º grau do TJSP. O grau deste processo não está confirmado dentro dessa cobertura."
            : query.isError
              ? "Verifique a conexão antes de contar com a busca automática."
              : "As publicações podem chegar pelo DJEN. A busca de autos depende de uma conexão ativa com o eproc; o acesso ao e-SAJ é separado."}
        </p>
      </div>
      {onPrepare ? (
        <button
          onClick={onPrepare}
          className="text-primary shrink-0 font-medium hover:underline"
        >
          Preparar acesso
        </button>
      ) : (
        <Link
          href="/primeira-importacao"
          className="text-primary shrink-0 font-medium hover:underline"
        >
          Preparar acesso
        </Link>
      )}
    </div>
  );
}
