"use client";

import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Field } from "@/components/mock-ui/input";
import { Card } from "@/components/mock-ui/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { useCertificados } from "../hooks/use-cert-upload";
import {
  useConnectCourtConnection,
  useCreateCourtConnection,
  useSubmitMfaSeed,
} from "../hooks/use-court-connections";
import type {
  CourtConnectionView,
  MfaSelectionCandidate,
} from "../types/court-connection";
import { MfaCapture } from "./mfa-capture";

// TJSP-first: o modelo é genérico (uma conexão por tribunal), mas só TJSP está
// calibrado hoje. Os demais aparecem desabilitados ("em breve") até cada eproc
// ter seus hosts descobertos no BE.
const TRIBUNAIS: { valor: string; label: string; disponivel: boolean }[] = [
  {
    valor: "TJSP",
    label: "TJSP — Tribunal de Justiça de São Paulo",
    disponivel: true,
  },
  { valor: "TJRS", label: "TJRS — em breve", disponivel: false },
  { valor: "TRF4", label: "TRF4 — em breve", disponivel: false },
];

const PASSOS = ["Tribunal e certificado", "Segundo fator"] as const;

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function CourtConnectionWizard({ onFechar }: { onFechar: () => void }) {
  const { data: certificados, isLoading: carregandoCerts } = useCertificados();
  const createMut = useCreateCourtConnection();
  const connectMut = useConnectCourtConnection();
  const mfaMut = useSubmitMfaSeed();

  const [passo, setPasso] = useState<0 | 1>(0);
  const [court, setCourt] = useState("TJSP");
  const [certRef, setCertRef] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<CourtConnectionView | null>(
    null,
  );
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [candidates, setCandidates] = useState<MfaSelectionCandidate[] | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  const conectado = connection?.status === "CONNECTED";
  const iniciando = createMut.isPending || connectMut.isPending;
  const semCert = !carregandoCerts && (certificados?.length ?? 0) === 0;

  // Passo 0 → cria (se ainda não criou) e conecta; roteia pro passo do 2º fator
  // ou conclui direto (caso o seed já estivesse no cofre).
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

  // Passo 1 → envia o 2º fator; se o QR trouxe várias contas, mostra o picker e
  // reenvia o MESMO print/código com o account_index escolhido.
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
    <Card>
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-3">
        {PASSOS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "flex items-center gap-2 text-[13px]",
              i === passo ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border text-[11px] tabular-nums",
                i === passo
                  ? "border-primary bg-primary text-primary-foreground"
                  : i < passo
                    ? "text-primary border-[color-mix(in_oklch,var(--primary)_40%,transparent)]"
                    : "border-border",
              )}
            >
              {i < passo ? "✓" : i + 1}
            </span>
            {label}
            {i < PASSOS.length - 1 && <span className="bg-border h-px w-6" />}
          </span>
        ))}
      </div>

      <div className="mt-5">
        {conectado ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="text-success size-8" />
            <p className="font-medium">Tribunal conectado</p>
            <p className="text-muted-foreground text-[13px]">
              A partir de agora os autos deste tribunal podem ser lidos
              automaticamente. Você não precisa repetir o segundo fator.
            </p>
          </div>
        ) : passo === 0 ? (
          <div className="flex flex-col gap-4">
            <Field label="Tribunal">
              <Select value={court} onValueChange={(v) => setCourt(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIBUNAIS.map((t) => (
                    <SelectItem
                      key={t.valor}
                      value={t.valor}
                      disabled={!t.disponivel}
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Certificado"
              hint="Usamos o certificado já cadastrado para autenticar no tribunal."
            >
              {semCert ? (
                <p className="text-muted-foreground rounded-lg border border-dashed border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-[color-mix(in_oklch,var(--primary)_3%,transparent)] px-3 py-3 text-[13px]">
                  Nenhum certificado cadastrado. Cadastre o seu na aba
                  Certificado e volte aqui.
                </p>
              ) : (
                <Select
                  value={certRef}
                  onValueChange={(v) => setCertRef(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o certificado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(certificados ?? []).map((cert) => (
                      <SelectItem key={cert.id} value={cert.id}>
                        {cert.subject_cn}
                        {cert.oab ? ` · ${cert.oab}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
        ) : (
          <MfaStep
            candidates={candidates}
            file={qrFile}
            onFile={setQrFile}
            secret={secret}
            onSecret={setSecret}
            enviando={mfaMut.isPending}
            onEnviar={enviarMfa}
          />
        )}

        {erro && !conectado && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
            <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="border-border mt-5 flex items-center justify-between gap-2 border-t pt-4">
        {conectado ? (
          <>
            <span />
            <Button size="sm" onClick={onFechar}>
              Concluir
            </Button>
          </>
        ) : passo === 0 ? (
          <>
            <Button variant="ghost" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!certRef || semCert || iniciando}
              onClick={iniciar}
            >
              {iniciando ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Conectando…
                </>
              ) : (
                "Conectar"
              )}
            </Button>
          </>
        ) : (
          // passo 1 (segundo fator) — a navegação principal fica no MfaStep;
          // aqui só o cancelar.
          <>
            <Button variant="ghost" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <span />
          </>
        )}
      </div>
    </Card>
  );
}

// MfaStep isola o passo do segundo fator: captura (print/código) OU o picker de
// contas quando o QR trouxe várias. Importa MfaCapture de forma tardia para
// manter o wizard legível.
function MfaStep({
  candidates,
  file,
  onFile,
  secret,
  onSecret,
  enviando,
  onEnviar,
}: {
  candidates: MfaSelectionCandidate[] | null;
  file: File | null;
  onFile: (f: File | null) => void;
  secret: string;
  onSecret: (s: string) => void;
  enviando: boolean;
  onEnviar: (accountIndex?: number) => void;
}) {
  if (candidates && candidates.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px]">
          O print traz mais de uma conta. Escolha a do tribunal:
        </p>
        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <button
              key={c.index}
              type="button"
              disabled={enviando}
              onClick={() => onEnviar(c.index)}
              className="border-border hover:border-primary hover:bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors"
            >
              <span>{c.label}</span>
              {enviando ? (
                <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
              ) : (
                <span className="text-muted-foreground text-xs">Usar esta</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-[13px]">
        No tribunal, em <strong>Configurar segundo fator</strong>, tire um print
        da tela do QR (ou exporte as contas do seu aplicativo autenticador) e
        envie aqui. É necessário só uma vez.
      </p>
      <MfaCapture
        file={file}
        onFile={onFile}
        secret={secret}
        onSecret={onSecret}
        disabled={enviando}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={(!file && !secret.trim()) || enviando}
          onClick={() => onEnviar()}
        >
          {enviando ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar segundo fator"
          )}
        </Button>
      </div>
    </div>
  );
}
