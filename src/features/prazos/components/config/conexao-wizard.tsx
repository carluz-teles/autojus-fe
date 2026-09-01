"use client";

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
import { ApiError } from "@/lib/api/errors";

import { MfaCaptura } from "./mfa-captura";

// TJSP-first: modelo genérico (uma conexão por tribunal), só TJSP calibrado hoje.
const TRIBUNAIS: { valor: string; label: string; disponivel: boolean }[] = [
  { valor: "TJSP", label: "TJSP — Tribunal de Justiça de São Paulo", disponivel: true },
  { valor: "TJRS", label: "TJRS — em breve", disponivel: false },
  { valor: "TRF4", label: "TRF4 — em breve", disponivel: false },
];

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

// Modal "Conectar tribunal" (eproc, BE real): escolhe tribunal + certificado,
// autentica, e — quando o tribunal pede — captura o segundo fator (print do QR
// ou código), com escolha de conta se o QR trouxer várias. Design das Configs.
export function ConexaoWizard({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const { data: certificados, isLoading: carregandoCerts } = useCertificados();
  const createMut = useCreateCourtConnection();
  const connectMut = useConnectCourtConnection();
  const mfaMut = useSubmitMfaSeed();

  const [passo, setPasso] = useState<0 | 1>(0);
  const [court, setCourt] = useState("TJSP");
  const [certRef, setCertRef] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<CourtConnectionView | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [candidates, setCandidates] = useState<MfaSelectionCandidate[] | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const conectado = connection?.status === "CONNECTED";
  const iniciando = createMut.isPending || connectMut.isPending;
  const semCert = !carregandoCerts && (certificados?.length ?? 0) === 0;

  async function iniciar() {
    if (!certRef) return;
    setErro(null);
    try {
      let id = connectionId;
      if (!id) {
        const c = await createMut.mutateAsync({
          court,
          system: "EPROC",
          certificateRef: certRef,
        });
        id = c.id;
        setConnectionId(id);
      }
      const c = await connectMut.mutateAsync(id);
      setConnection(c);
      if (c.status === "CONNECTED" || c.status === "MFA_ENROLLMENT_REQUIRED") {
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
    <div
      onClick={onFechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[480px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              Conectar tribunal
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">
              {passo === 0
                ? "Escolha o tribunal e o certificado."
                : "Segundo fator do tribunal — só uma vez."}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-[22px] py-5">
          {conectado ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="text-primary size-8" strokeWidth={1.7} />
              <p className="text-[14px] font-medium">Tribunal conectado</p>
              <p className="text-fg3 max-w-[320px] text-[12.5px] leading-[1.5]">
                Os autos deste tribunal passam a ser lidos automaticamente. Você
                não precisa repetir o segundo fator.
              </p>
            </div>
          ) : passo === 0 ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-fg3 mb-1.5 block text-[11.5px]">
                  Tribunal
                </label>
                <select
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                >
                  {TRIBUNAIS.map((t) => (
                    <option key={t.valor} value={t.valor} disabled={!t.disponivel}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-fg3 mb-1.5 block text-[11.5px]">
                  Certificado
                </label>
                {semCert ? (
                  <p className="border-line bg-bg text-fg3 rounded-[9px] border border-dashed px-[13px] py-3 text-[12.5px]">
                    Nenhum certificado cadastrado. Adicione um em Certificados
                    digitais e volte aqui.
                  </p>
                ) : (
                  <select
                    value={certRef}
                    onChange={(e) => setCertRef(e.target.value)}
                    className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                  >
                    <option value="" disabled>
                      Selecione o certificado
                    </option>
                    {(certificados ?? []).map((cert) => (
                      <option key={cert.id} value={cert.id}>
                        {cert.subject_cn}
                        {cert.oab ? ` · ${cert.oab}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
                No tribunal, em <strong>Configurar segundo fator</strong>, tire um
                print do QR (ou exporte as contas do seu autenticador) e envie
                aqui.
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
                className="border-line bg-panel text-fg2 hover:bg-hover rounded-[9px] border px-3.5 py-2 text-[12.5px]"
              >
                Cancelar
              </button>
              {passo === 0 ? (
                <button
                  disabled={!certRef || semCert || iniciando}
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
      </div>
    </div>
  );
}
