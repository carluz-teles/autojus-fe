"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, CheckCircle2, FileStack, Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "@/features/configuracoes/types/court-connection";

import { useCertWizard } from "../../hooks/use-cert-wizard";
import {
  type SistemaEstado,
  useConexaoWizard,
} from "../../hooks/use-conexao-wizard";
import { CertWizard } from "./cert-wizard";
import { MfaCaptura } from "./mfa-captura";

// Wizard UNIFICADO por tribunal: um certificado A1 conecta os vários sistemas do
// tribunal (eproc, e-SAJ). Para cada sistema o BE decide se pede segundo fator e
// qual (TOTP_APP → print do QR/segredo; EMAIL_CODE → código por e-mail). Se o
// portal aceitar só o certificado, o sistema fica CONNECTED sem passo de 2FA.
// Toda a lógica vive em useConexaoWizard; aqui é só JSX + binding.

type Wizard = ReturnType<typeof useConexaoWizard>;

/** Captura do segundo fator de UM sistema, conforme o tipo exigido. */
function Segundo2FA({
  sistema,
  wizard,
}: {
  sistema: SistemaEstado;
  wizard: Wizard;
}) {
  const emailCode = sistema.secondFactor === "EMAIL_CODE";
  const enviando = sistema.enviando2fa;
  const codeId = `mfa-code-${sistema.system}`;

  if (sistema.candidates && sistema.candidates.length > 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <p className="text-[12.5px]">
          O print traz mais de uma conta. Escolha a do tribunal:
        </p>
        {sistema.candidates.map((c) => (
          <button
            key={c.index}
            type="button"
            disabled={enviando}
            onClick={() => void wizard.enviarMfa(sistema.system, c.index)}
            className="border-line bg-bg hover:bg-hover flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left text-[13px]"
          >
            <span>{c.label}</span>
            {enviando ? (
              <Loader2 className="text-fg3 size-3.5 animate-spin" aria-hidden />
            ) : (
              <span className="text-fg3 text-[11px]">Usar esta</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {emailCode ? (
        <>
          <p className="text-fg3 text-[12.5px] leading-[1.5]">
            O {sistema.nome} enviou um código de seis dígitos para o e-mail
            cadastrado no portal. Informe o código mais recente — ele expira a
            cada tentativa.
          </p>
          <label htmlFor={codeId} className="sr-only">
            Código do segundo fator do {sistema.nome}
          </label>
          <Input
            id={codeId}
            value={sistema.code}
            disabled={enviando}
            onChange={(e) => wizard.setCode(sistema.system, e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="w-40 tracking-[0.3em] tabular-nums"
          />
        </>
      ) : (
        <>
          <p className="text-fg3 text-[12.5px] leading-[1.5]">
            Exporte a conta do tribunal no seu autenticador e envie o QR code,
            ou informe a chave de configuração TOTP. Use a conta já cadastrada;
            não é necessário desativar o 2FA. O código temporário de seis
            dígitos não serve para esta integração.
          </p>
          <MfaCaptura
            file={sistema.qrFile}
            onFile={(f) => wizard.setQrFile(sistema.system, f)}
            secret={sistema.secret}
            onSecret={(s) => wizard.setSecret(sistema.system, s)}
            disabled={enviando}
          />
        </>
      )}
      {sistema.erro && (
        <p role="alert" className="text-destructive text-[12px] leading-[1.45]">
          {sistema.erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            enviando ||
            (emailCode
              ? !sistema.code.trim()
              : !sistema.qrFile && !sistema.secret.trim())
          }
          onClick={() => void wizard.enviarMfa(sistema.system)}
          className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-50 pointer-coarse:min-h-11"
        >
          {enviando && (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          )}
          {enviando
            ? "Enviando…"
            : emailCode
              ? "Enviar código"
              : "Enviar segundo fator"}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => wizard.pular(sistema.system)}
          className="text-fg3 hover:text-foreground text-[12px] underline"
        >
          Não tenho 2FA neste tribunal
        </button>
      </div>
    </div>
  );
}

/** Cartão de progresso de UM sistema no passo de conexão. */
function SistemaProgresso({
  sistema,
  wizard,
}: {
  sistema: SistemaEstado;
  wizard: Wizard;
}) {
  return (
    <section
      aria-label={`${wizard.court} · ${sistema.nome}`}
      className="border-line rounded-[10px] border p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{sistema.nome}</span>
          {sistema.fase === "conectado" && (
            <CheckCircle2 className="text-primary size-4" aria-hidden />
          )}
          {(sistema.fase === "erro" || sistema.fase === "pulado") && (
            <AlertCircle className="text-gold size-4" aria-hidden />
          )}
        </div>
        <span className="text-fg3 text-[11.5px]">
          {sistema.fase === "conectando"
            ? "Conectando…"
            : sistema.fase === "conectado"
              ? "Conectado"
              : sistema.fase === "requer_2fa"
                ? "Segundo fator"
                : sistema.fase === "pulado"
                  ? "2FA pendente"
                  : sistema.fase === "erro"
                    ? "Falha"
                    : "Aguardando"}
        </span>
      </div>

      {sistema.fase === "conectando" && (
        <div className="text-fg3 mt-2 flex items-center gap-2 text-[12px]">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Autenticando com o certificado…
        </div>
      )}

      {sistema.fase === "conectado" && (
        <p className="text-fg3 mt-1.5 text-[12px] leading-[1.5]">
          Acesso ativo. A busca respeita o acesso do seu usuário.
        </p>
      )}

      {sistema.fase === "pulado" && (
        <p className="text-fg3 mt-1.5 text-[12px] leading-[1.5]">
          Sem o segundo fator, este sistema pode não completar a conexão. Você
          pode concluí-lo depois em Fontes de dados › Tribunais.
        </p>
      )}

      {sistema.fase === "erro" && (
        <div className="mt-1.5 flex flex-col gap-2">
          <p
            role="alert"
            className="text-destructive text-[12px] leading-[1.45]"
          >
            {sistema.erro || "Não foi possível conectar."}
          </p>
          <button
            type="button"
            onClick={() => wizard.reconectar(sistema.system)}
            className="text-primary self-start text-[12px] underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {sistema.fase === "requer_2fa" && (
        <div className="mt-3">
          <Segundo2FA sistema={sistema} wizard={wizard} />
        </div>
      )}
    </section>
  );
}

export function ConexaoWizard({
  aberto,
  onFechar,
  court,
  courtName,
  entries,
  connections,
}: {
  aberto: boolean;
  onFechar: () => void;
  court: string;
  courtName: string;
  entries: CourtCatalogEntry[];
  connections: CourtConnectionView[];
}) {
  const wizard = useConexaoWizard({ court, entries, connections });
  const certWizard = useCertWizard();

  // Ao conectar o tribunal, INICIA a busca dos autos dos processos já na base
  // (uma vez). O BE aplica a regra tem-processo→busca / não-tem→nada.
  const jaBuscouAutos = useRef(false);
  useEffect(() => {
    if (wizard.resolvido && wizard.algumConectado && !jaBuscouAutos.current) {
      jaBuscouAutos.current = true;
      void wizard.buscarAutos();
    }
  }, [wizard]);

  if (!aberto) return null;

  const {
    passo,
    sistemas,
    usable,
    semCert,
    erroCerts,
    certRef,
    setCertRef,
    selectedCertRef,
    precisaCert,
    ocupado,
    iniciando,
    resolvido,
    algumConectado,
    conectados,
    totalConectaveis,
    autos,
  } = wizard;

  const nomesSistemas = sistemas.map((s) => s.nome).join(" e ");

  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(open) => {
        if (!open && !ocupado) onFechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Popup className="surface-panel fixed top-1/2 left-1/2 z-40 max-h-[90dvh] w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl">
          <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
            <div>
              <Dialog.Title className="text-[16px] font-medium">
                {resolvido ? "Conexão" : "Conectar"} {court}
              </Dialog.Title>
              <Dialog.Description className="text-fg3 mt-[3px] text-[12px]">
                {resolvido
                  ? `${courtName} · ${conectados} de ${totalConectaveis} ${
                      totalConectaveis === 1 ? "sistema" : "sistemas"
                    } conectado${conectados === 1 ? "" : "s"}.`
                  : passo === "certificado"
                    ? `Um certificado conecta ${nomesSistemas}. O segundo fator só é pedido se o portal solicitar.`
                    : "Acompanhe a conexão de cada sistema. O segundo fator é pedido apenas quando o portal exige."}
              </Dialog.Description>
            </div>
            <IconAction
              label="Fechar conexão"
              icon={X}
              onClick={onFechar}
              disabled={ocupado}
              className="pointer-coarse:size-11"
            />
          </div>

          <div className="px-[22px] py-5">
            {passo === "certificado" ? (
              <div className="flex flex-col gap-4">
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
                        Usaremos o certificado válido já cadastrado. O mesmo
                        certificado serve os sistemas do tribunal.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={certRef}
                      onValueChange={(v) => setCertRef(v ?? "")}
                      disabled={iniciando}
                    >
                      <SelectTrigger
                        id="connection-certificate"
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecione o certificado">
                          {usable.find((c) => c.id === selectedCertRef)
                            ?.subject_cn ?? "Selecione o certificado"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {usable.map((cert) => (
                            <SelectItem key={cert.id} value={cert.id}>
                              {cert.subject_cn}
                              {cert.oab ? ` · ${cert.oab}` : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="border-line bg-bg rounded-lg border p-3 text-[12.5px]">
                  <p className="text-fg3">
                    Vamos conectar:{" "}
                    <span className="text-foreground">{nomesSistemas}</span>.
                  </p>
                </div>
                {erroCerts && (
                  <p role="alert" className="text-destructive text-[12px]">
                    Não foi possível verificar os certificados. Feche e tente
                    novamente.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sistemas.map((sistema) => (
                  <SistemaProgresso
                    key={sistema.system}
                    sistema={sistema}
                    wizard={wizard}
                  />
                ))}
                {resolvido && algumConectado && (
                  <div className="surface-inset flex items-start gap-2.5 rounded-[10px] px-3.5 py-3">
                    {autos.fase === "buscando" ? (
                      <Loader2
                        className="text-primary mt-px size-4 flex-none animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <FileStack
                        className="mt-px size-4 flex-none"
                        style={{
                          color:
                            autos.fase === "ok" && autos.queued > 0
                              ? "var(--green)"
                              : "var(--fg3)",
                        }}
                        aria-hidden
                      />
                    )}
                    <p className="text-[12px] leading-[1.5]">
                      {autos.fase === "buscando"
                        ? `Verificando quais processos do ${court} já estão na sua base…`
                        : autos.fase === "erro"
                          ? "Conectado. Não foi possível iniciar a busca dos autos agora — use “Sincronizar autos” em Fontes de dados › Tribunais."
                          : autos.queued > 0
                            ? `Buscando os autos de ${autos.queued} ${autos.queued === 1 ? "processo" : "processos"} do ${court} que já estão na sua base. Eles chegam em segundo plano.`
                            : `Conectado. Nenhum processo do ${court} na sua base ainda — os autos serão buscados automaticamente assim que chegarem.`}
                    </p>
                  </div>
                )}
                {resolvido && !algumConectado && (
                  <p className="text-fg3 text-[12px] leading-[1.5]">
                    Nenhum sistema conectou. Verifique o certificado e o segundo
                    fator e tente novamente em Fontes de dados › Tribunais.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-line2 flex items-center justify-end gap-2 border-t px-[22px] py-3.5">
            {resolvido ? (
              <button
                onClick={onFechar}
                className="bg-primary text-primary-foreground rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium pointer-coarse:min-h-11"
              >
                Concluir
              </button>
            ) : (
              <>
                <button
                  onClick={onFechar}
                  disabled={ocupado}
                  className="border-line bg-panel text-fg2 hover:bg-hover rounded-[9px] border px-3.5 py-2 text-[12.5px] pointer-coarse:min-h-11"
                >
                  {passo === "certificado" ? "Cancelar" : "Fechar"}
                </button>
                {passo === "certificado" && (
                  <button
                    disabled={(precisaCert && !selectedCertRef) || iniciando}
                    onClick={() => void wizard.conectar()}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-50 pointer-coarse:min-h-11"
                  >
                    {iniciando && (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    )}
                    {iniciando ? "Conectando…" : "Conectar"}
                  </button>
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
