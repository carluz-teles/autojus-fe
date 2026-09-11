"use client";

import { Check, FileKey2, Landmark } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCertificados } from "@/features/configuracoes/hooks/use-cert-upload";
import { useCourtConnections } from "@/features/configuracoes/hooks/use-court-connections";
import { CertWizard } from "@/features/prazos/components/config/cert-wizard";
import { ConfigTribunais } from "@/features/prazos/components/config/config-tribunais";
import { useCertWizard } from "@/features/prazos/hooks/use-cert-wizard";

import { courtAccess, usableCertificates } from "../lib/import-readiness";

/** Shared by signup and the resumable setup page. Steps reflect persisted data. */
export function ImportPreparation({ onContinue }: { onContinue: () => void }) {
  const certs = useCertificados();
  const connections = useCourtConnections();
  const wizard = useCertWizard();
  const [showCourts, setShowCourts] = useState(false);
  const loading = certs.isPending || connections.isPending;
  const error = certs.isError || connections.isError;
  const valid = usableCertificates(certs.data ?? []);
  const access = courtAccess(connections.data ?? []);
  const ready = valid.length > 0 && access === "connected";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-primary mb-2 text-[11px] font-medium">
          PRIMEIRA IMPORTAÇÃO
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Prepare o acesso aos autos
        </h1>
        <p className="text-fg3 mt-2 text-[13px] leading-relaxed">
          A OAB encontra suas publicações. Para buscar os documentos dos
          processos, prepare primeiro o certificado e a conexão com o tribunal.
        </p>
      </div>
      <ol className="border-line bg-panel divide-line divide-y overflow-hidden rounded-lg border">
        <li className="flex items-start gap-3 p-4">
          <span className="bg-hover text-primary grid size-8 shrink-0 place-items-center rounded-md">
            {valid.length ? (
              <Check className="size-4" />
            ) : (
              <FileKey2 className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">1. Certificado digital A1</p>
            <p className="text-fg3 mt-1 text-[12px]">
              {loading
                ? "Verificando certificado…"
                : valid.length
                  ? `${valid[0].subject_cn} · certificado válido`
                  : "Envie seu arquivo .pfx ou .p12. A senha é usada para abrir o arquivo e não é armazenada."}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={wizard.abrir}
              disabled={loading}
            >
              {valid.length
                ? "Adicionar outro certificado"
                : "Adicionar certificado"}
            </Button>
          </div>
        </li>
        <li className="flex items-start gap-3 p-4">
          <span className="bg-hover text-primary grid size-8 shrink-0 place-items-center rounded-md">
            {access === "connected" ? (
              <Check className="size-4" />
            ) : (
              <Landmark className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              2. Acesso ao eproc e segundo fator (2FA)
            </p>
            <p className="text-fg3 mt-1 text-[12px]">
              {access === "connected"
                ? `Conexão ativa: ${(connections.data ?? [])
                    .filter(
                      (c) => c.system === "EPROC" && c.status === "CONNECTED",
                    )
                    .map((c) => `${c.court} · eproc`)
                    .join(
                      ", ",
                    )}. Cada tribunal e sistema tem seu próprio acesso.`
                : access === "mfa"
                  ? "Conexão iniciada. Falta concluir o segundo fator para buscar os autos."
                  : "Escolha o tribunal e conecte o eproc com o 2FA do seu autenticador. O e-SAJ é acessado separadamente ao preparar uma peça."}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => setShowCourts((v) => !v)}
              disabled={loading}
              aria-expanded={showCourts}
            >
              {showCourts ? "Recolher tribunais" : "Ver tribunais e conectar"}
            </Button>
          </div>
        </li>
        <li className="flex items-start gap-3 p-4">
          <span className="bg-hover text-fg3 grid size-8 shrink-0 place-items-center rounded-md text-[12px]">
            3
          </span>
          <div>
            <p className="font-medium">OAB e primeira captura</p>
            <p className="text-fg3 mt-1 text-[12px]">
              No próximo passo, confira a OAB antes de iniciar a busca de
              publicações.
            </p>
          </div>
        </li>
      </ol>
      {showCourts && <ConfigTribunais />}
      {error ? (
        <p role="alert" className="text-destructive text-[12px]">
          Não foi possível verificar a preparação.{" "}
          <button
            className="underline"
            onClick={() => {
              void certs.refetch();
              void connections.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        !loading &&
        !ready && (
          <div
            role="status"
            className="border-line rounded-lg border p-3 text-[12px] leading-relaxed"
          >
            <p className="font-medium">Você pode começar pelas publicações</p>
            <p className="text-fg3 mt-1">
              Sem uma conexão ativa, os autos não serão buscados
              automaticamente. Você poderá conectar o tribunal depois e usar
              Sincronizar autos na aba Autos de cada processo.
            </p>
          </div>
        )
      )}
      <Button
        className="h-9 w-full"
        variant={ready ? "default" : "outline"}
        onClick={onContinue}
        disabled={loading || error}
      >
        {ready ? "Continuar para a OAB" : "Continuar só com publicações"}
      </Button>
      <CertWizard w={wizard} />
    </div>
  );
}
