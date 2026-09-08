"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useState } from "react";

import { useCertificados } from "@/features/configuracoes/hooks/use-cert-upload";
import {
  useConnectCourtConnection,
  useCreateCourtConnection,
  useSubmitMfaSeed,
} from "@/features/configuracoes/hooks/use-court-connections";
import type {
  CourtConnectionView,
  MfaSelectionCandidate,
} from "@/features/configuracoes/types/court-connection";
import { usableCertificates } from "@/features/onboarding/lib/import-readiness";
import { ApiError } from "@/lib/api/errors";

import { useCertWizard } from "../../hooks/use-cert-wizard";
import { CertWizard } from "./cert-wizard";
import { MfaCaptura } from "./mfa-captura";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

// Modal de acesso ao tribunal já escolhido na lista: seleciona certificado,
// autentica, e — quando o tribunal pede — captura o segundo fator (print do QR
// ou código), com escolha de conta se o QR trouxer várias. Design das Configs.
export function ConexaoWizard({
  aberto,
  onFechar,
  court,
  existingConnection,
}: {
  aberto: boolean;
  onFechar: () => void;
  court: string;
  existingConnection?: CourtConnectionView;
}) {
  const {
    data: certificados,
    isLoading: carregandoCerts,
    isError: erroCerts,
  } = useCertificados();
  const certWizard = useCertWizard();
  const usable = usableCertificates(certificados ?? []);
  const createMut = useCreateCourtConnection();
  const connectMut = useConnectCourtConnection();
  const mfaMut = useSubmitMfaSeed();

  const [passo, setPasso] = useState<0 | 1>(
    existingConnection &&
      ["MFA_ENROLLMENT_REQUIRED", "MFA_REQUIRED"].includes(
        existingConnection.status,
      )
      ? 1
      : 0,
  );
  const [certRef, setCertRef] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(
    existingConnection?.id ?? null,
  );
  const [connection, setConnection] = useState<CourtConnectionView | null>(
    existingConnection ?? null,
  );
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [candidates, setCandidates] = useState<MfaSelectionCandidate[] | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const conectado = connection?.status === "CONNECTED";
  const iniciando = createMut.isPending || connectMut.isPending;
  const semCert = !carregandoCerts && !erroCerts && usable.length === 0;
  const selectedCertRef =
    usable.length === 1
      ? usable[0].id
      : usable.some((c) => c.id === certRef)
        ? certRef
        : "";

  async function iniciar() {
    if (!selectedCertRef && !connectionId) return;
    setErro(null);
    try {
      let id = connectionId;
      if (!id) {
        const c = await createMut.mutateAsync({
          court,
          system: "EPROC",
          certificateRef: selectedCertRef,
        });
        id = c.id;
        setConnectionId(id);
      }
      const c = await connectMut.mutateAsync(id);
      setConnection(c);
      if (
        ["CONNECTED", "MFA_ENROLLMENT_REQUIRED", "MFA_REQUIRED"].includes(
          c.status,
        )
      ) {
        setPasso(1);
      } else {
        setErro(c.error || "Não foi possível conectar. Tente novamente.");
      }
    } catch (e) {
      setErro(errorMessage(e));
    }
  }

  async function enviarMfa(accountIndex?: number) {
    if (!connectionId) return;
    setErro(null);
    try {
      const res = await mfaMut.mutateAsync({
        id: connectionId,
        input: {
          qr: qrFile ?? undefined,
          secret: secret.trim() || undefined,
          accountIndex,
        },
      });
      if (res.kind === "needs_selection") {
        setCandidates(res.candidates);
        return;
      }
      setCandidates(null);
      setConnection(res.connection);
      if (res.connection.status === "CONNECTED") {
        setSecret("");
        setQrFile(null);
      }
      if (res.connection.status !== "CONNECTED") {
        setErro(
          res.connection.error ||
            "Ainda não conectado. Confira o print/código e tente novamente.",
        );
      }
    } catch (e) {
      setErro(errorMessage(e));
    }
  }

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(open) => {
        if (!open && !iniciando && !mfaMut.isPending) onFechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Popup className="border-line bg-panel fixed top-1/2 left-1/2 z-40 max-h-[90dvh] w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border shadow-xl">
          <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
            <div>
              <Dialog.Title className="text-[16px] font-medium">
                {conectado ? "Conexão" : "Conectar"} {court} · eproc
              </Dialog.Title>
              <Dialog.Description className="text-fg3 mt-[3px] text-[12px]">
                {conectado
                  ? "Acesso para consulta e sincronização de autos."
                  : passo === 0
                    ? "Confirme o acesso com seu certificado e segundo fator."
                    : "Segundo fator do tribunal — só uma vez."}
              </Dialog.Description>
            </div>
            <button
              onClick={onFechar}
              aria-label="Fechar conexão"
              disabled={iniciando || mfaMut.isPending}
              className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="px-[22px] py-5">
            {conectado ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2
                  className="text-primary size-8"
                  strokeWidth={1.7}
                />
                <p className="text-[14px] font-medium">eproc conectado</p>
                <p className="text-fg3 max-w-[320px] text-[12.5px] leading-[1.5]">
                  A conexão está ativa para o eproc de 1º grau do {court}. A
                  busca respeita o acesso do seu usuário. Alterações no
                  certificado ou no 2FA podem exigir reconexão. O acesso ao
                  e-SAJ é separado.
                </p>
              </div>
            ) : passo === 0 ? (
              <div className="flex flex-col gap-4">
                {!connectionId && (
                  <div>
                    <label
                      htmlFor={
                        usable.length > 1 ? "connection-certificate" : undefined
                      }
                      className="text-fg3 mb-1.5 block text-[11.5px]"
                    >
                      Certificado
                    </label>
                    {semCert ? (
                      <p className="border-line bg-bg text-fg3 rounded-[9px] border border-dashed px-[13px] py-3 text-[12.5px]">
                        Nenhum certificado válido cadastrado.{" "}
                        <button
                          className="text-primary underline"
                          onClick={certWizard.abrir}
                        >
                          Adicionar certificado A1
                        </button>
                      </p>
                    ) : usable.length === 1 ? (
                      <div className="border-line bg-bg rounded-lg border p-3 text-[12.5px]">
                        <p className="font-medium">{usable[0].subject_cn}</p>
                        <p className="text-fg3 mt-1">
                          Usaremos o certificado válido já cadastrado. Não é
                          necessário enviar o arquivo novamente.
                        </p>
                      </div>
                    ) : (
                      <select
                        id="connection-certificate"
                        disabled={iniciando}
                        value={certRef}
                        onChange={(e) => setCertRef(e.target.value)}
                        className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                      >
                        <option value="" disabled>
                          Selecione o certificado
                        </option>
                        {usable.map((cert) => (
                          <option key={cert.id} value={cert.id}>
                            {cert.subject_cn}
                            {cert.oab ? ` · ${cert.oab}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {connectionId && (
                  <p className="text-fg3 text-[12px]">
                    Retomando a conexão existente com o certificado cadastrado.
                  </p>
                )}
              </div>
            ) : candidates && candidates.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-[12.5px]">
                  O print traz mais de uma conta. Escolha a do tribunal:
                </p>
                {candidates.map((c) => (
                  <button
                    key={c.index}
                    type="button"
                    disabled={mfaMut.isPending}
                    onClick={() => enviarMfa(c.index)}
                    className="border-line bg-bg hover:bg-hover flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left text-[13px]"
                  >
                    <span>{c.label}</span>
                    {mfaMut.isPending ? (
                      <Loader2 className="text-fg3 size-3.5 animate-spin" />
                    ) : (
                      <span className="text-fg3 text-[11px]">Usar esta</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <p className="text-fg3 text-[12.5px] leading-[1.5]">
                  Exporte a conta do tribunal no seu autenticador e envie o QR
                  code, ou informe a chave de configuração TOTP. Use a conta já
                  cadastrada; não é necessário desativar o 2FA. O código
                  temporário de seis dígitos não serve para esta integração.
                </p>
                <MfaCaptura
                  file={qrFile}
                  onFile={setQrFile}
                  secret={secret}
                  onSecret={setSecret}
                  disabled={mfaMut.isPending}
                />
              </div>
            )}

            {connectionId && passo === 0 && !conectado && (
              <button
                className="text-primary mt-3 text-[12px] underline"
                disabled={iniciando}
                onClick={() => setPasso(1)}
              >
                Atualizar segundo fator
              </button>
            )}
            {erroCerts && (
              <p role="alert" className="text-destructive mt-3 text-[12px]">
                Não foi possível verificar os certificados. Feche e tente
                novamente.
              </p>
            )}
            {erro && !conectado && (
              <p className="text-destructive mt-3 text-[12px] leading-[1.45]">
                {erro}
              </p>
            )}
          </div>

          <div className="border-line2 flex items-center justify-end gap-2 border-t px-[22px] py-3.5">
            {conectado ? (
              <button
                onClick={onFechar}
                className="bg-primary text-primary-foreground rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium"
              >
                Concluir
              </button>
            ) : (
              <>
                <button
                  onClick={onFechar}
                  disabled={iniciando || mfaMut.isPending}
                  className="border-line bg-panel text-fg2 hover:bg-hover rounded-[9px] border px-3.5 py-2 text-[12.5px]"
                >
                  Cancelar
                </button>
                {passo === 0 ? (
                  <button
                    disabled={
                      (!connectionId &&
                        (!selectedCertRef || semCert || erroCerts)) ||
                      iniciando
                    }
                    onClick={iniciar}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-50"
                  >
                    {iniciando && <Loader2 className="size-3.5 animate-spin" />}
                    {iniciando ? "Conectando…" : "Conectar"}
                  </button>
                ) : (
                  !candidates && (
                    <button
                      disabled={(!qrFile && !secret.trim()) || mfaMut.isPending}
                      onClick={() => enviarMfa()}
                      className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-50"
                    >
                      {mfaMut.isPending && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      {mfaMut.isPending ? "Enviando…" : "Enviar segundo fator"}
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
      <CertWizard w={certWizard} />
    </Dialog.Root>
  );
}
