"use client";

import { useCallback, useMemo, useState } from "react";

import { useCertificados } from "@/features/configuracoes/hooks/use-cert-upload";
import {
  useConnectCourtConnection,
  useCreateCourtConnection,
  useSubmitMfaCode,
  useSubmitMfaSeed,
} from "@/features/configuracoes/hooks/use-court-connections";
import { courtSystemName } from "@/features/configuracoes/lib/court-catalog";
import type {
  CourtCatalogEntry,
  CourtConnectionStatus,
  CourtConnectionView,
  MfaSelectionCandidate,
  SecondFactor,
} from "@/features/configuracoes/types/court-connection";
import { usableCertificates } from "@/features/onboarding/lib/import-readiness";
import { ApiError } from "@/lib/api/errors";

// Motor do wizard UNIFICADO de conexão por tribunal: um certificado A1 serve os
// vários sistemas do tribunal (eproc, e-SAJ). Para cada sistema o BE decide se
// pede segundo fator (e qual) — o certificado é o núcleo, o 2FA é condicional.
// Toda a lógica (criar/conectar/2FA por sistema) vive aqui; o componente só liga
// JSX ao estado, seguindo a regra de arquitetura service → hook → componente.

/** Passo do wizard: escolher o certificado, ou acompanhar a conexão por sistema. */
export type WizardPasso = "certificado" | "conectar";

/** Situação de UM sistema do tribunal dentro do fluxo. */
export type SistemaFase =
  | "pendente" // ainda não conectado nesta sessão (ou nunca)
  | "conectando" // create/connect em andamento
  | "conectado" // CONNECTED
  | "requer_2fa" // MFA_REQUIRED / MFA_ENROLLMENT_REQUIRED — falta o segundo fator
  | "pulado" // usuário optou por não enviar 2FA agora
  | "erro"; // falha de conexão não relacionada a 2FA

export interface SistemaEstado {
  system: string;
  nome: string;
  secondFactor: SecondFactor;
  connectionId: string | null;
  status: CourtConnectionStatus | null;
  fase: SistemaFase;
  erro: string | null;
  // Captura do 2FA (por sistema, pois eproc e e-SAJ usam mecanismos diferentes).
  qrFile: File | null;
  secret: string;
  code: string;
  candidates: MfaSelectionCandidate[] | null;
  enviando2fa: boolean;
}

function mensagemErro(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

/** Mapeia o status devolvido pelo BE para a fase de UI de um sistema. */
function faseDoStatus(status: CourtConnectionStatus): SistemaFase {
  if (status === "CONNECTED") return "conectado";
  if (status === "MFA_REQUIRED" || status === "MFA_ENROLLMENT_REQUIRED") {
    return "requer_2fa";
  }
  return "erro";
}

function estadoInicial(
  entries: CourtCatalogEntry[],
  connections: CourtConnectionView[],
): SistemaEstado[] {
  return entries.map((entry) => {
    const matches = connections.filter(
      (c) => c.court === entry.court && c.system === entry.system,
    );
    const conn = matches.find((c) => c.status === "CONNECTED") ?? matches[0];
    const status = conn?.status ?? null;
    return {
      system: entry.system,
      nome: courtSystemName(entry.system),
      secondFactor: entry.second_factor ?? "",
      connectionId: conn?.id ?? null,
      status,
      fase: status
        ? status === "CONNECTED"
          ? "conectado"
          : status === "MFA_REQUIRED" || status === "MFA_ENROLLMENT_REQUIRED"
            ? "requer_2fa"
            : "pendente"
        : "pendente",
      erro: null,
      qrFile: null,
      secret: "",
      code: "",
      candidates: null,
      enviando2fa: false,
    };
  });
}

export interface UseConexaoWizardArgs {
  court: string;
  /** Sistemas conectáveis do tribunal (available && não PER_OPERATION). */
  entries: CourtCatalogEntry[];
  /** Conexões existentes do tenant (todas — o hook filtra por tribunal/sistema). */
  connections: CourtConnectionView[];
}

export function useConexaoWizard({
  court,
  entries,
  connections,
}: UseConexaoWizardArgs) {
  const {
    data: certificados,
    isLoading: carregandoCerts,
    isError: erroCerts,
  } = useCertificados();
  const usable = useMemo(
    () => usableCertificates(certificados ?? []),
    [certificados],
  );

  const createMut = useCreateCourtConnection();
  const connectMut = useConnectCourtConnection();
  const mfaSeedMut = useSubmitMfaSeed();
  const mfaCodeMut = useSubmitMfaCode();

  const [sistemas, setSistemas] = useState<SistemaEstado[]>(() =>
    estadoInicial(entries, connections),
  );

  // Se todo sistema já tem conexão registrada, não precisamos do certificado
  // para retomar (o connect/2FA reaproveita a conexão existente).
  const precisaCert = sistemas.some((s) => !s.connectionId);
  const [passo, setPasso] = useState<WizardPasso>(
    precisaCert ? "certificado" : "conectar",
  );
  const [certRef, setCertRef] = useState("");

  const semCert = !carregandoCerts && !erroCerts && usable.length === 0;
  const selectedCertRef =
    usable.length === 1
      ? usable[0].id
      : usable.some((c) => c.id === certRef)
        ? certRef
        : "";

  const patch = useCallback(
    (system: string, valores: Partial<SistemaEstado>) => {
      setSistemas((prev) =>
        prev.map((s) => (s.system === system ? { ...s, ...valores } : s)),
      );
    },
    [],
  );

  const setQrFile = useCallback(
    (system: string, f: File | null) => patch(system, { qrFile: f }),
    [patch],
  );
  const setSecret = useCallback(
    (system: string, secret: string) => patch(system, { secret }),
    [patch],
  );
  const setCode = useCallback(
    (system: string, code: string) => patch(system, { code }),
    [patch],
  );

  /** Cria (se preciso) e conecta um sistema; devolve a fase resultante. */
  const conectarSistema = useCallback(
    async (sistema: SistemaEstado) => {
      patch(sistema.system, { fase: "conectando", erro: null });
      try {
        let id = sistema.connectionId;
        if (!id) {
          const criada = await createMut.mutateAsync({
            court,
            system: sistema.system,
            certificateRef: selectedCertRef,
          });
          id = criada.id;
        }
        const conn = await connectMut.mutateAsync(id);
        patch(sistema.system, {
          connectionId: id,
          status: conn.status,
          fase: faseDoStatus(conn.status),
          erro:
            faseDoStatus(conn.status) === "erro"
              ? conn.error || "Não foi possível conectar. Tente novamente."
              : null,
        });
      } catch (e) {
        patch(sistema.system, { fase: "erro", erro: mensagemErro(e) });
      }
    },
    [court, selectedCertRef, createMut, connectMut, patch],
  );

  /** Conecta todos os sistemas que ainda não estão conectados. */
  const conectar = useCallback(async () => {
    if (precisaCert && !selectedCertRef) return;
    setPasso("conectar");
    const alvo = sistemas.filter(
      (s) => s.fase === "pendente" || s.fase === "erro",
    );
    await Promise.allSettled(alvo.map((s) => conectarSistema(s)));
  }, [precisaCert, selectedCertRef, sistemas, conectarSistema]);

  /** Reconecta um único sistema (retomar após erro). */
  const reconectar = useCallback(
    (system: string) => {
      const s = sistemas.find((x) => x.system === system);
      if (s) void conectarSistema(s);
    },
    [sistemas, conectarSistema],
  );

  /** Envia o segundo fator do sistema conforme o tipo (TOTP_APP ou EMAIL_CODE). */
  const enviarMfa = useCallback(
    async (system: string, accountIndex?: number) => {
      const s = sistemas.find((x) => x.system === system);
      if (!s || !s.connectionId) return;
      patch(system, { enviando2fa: true, erro: null });
      try {
        if (s.secondFactor === "EMAIL_CODE") {
          const conn = await mfaCodeMut.mutateAsync({
            id: s.connectionId,
            code: s.code.trim(),
          });
          patch(system, {
            status: conn.status,
            fase: faseDoStatus(conn.status),
            enviando2fa: false,
            code: conn.status === "CONNECTED" ? "" : s.code,
          });
        } else {
          const res = await mfaSeedMut.mutateAsync({
            id: s.connectionId,
            input: {
              qr: s.qrFile ?? undefined,
              secret: s.secret.trim() || undefined,
              accountIndex,
            },
          });
          if (res.kind === "needs_selection") {
            patch(system, { candidates: res.candidates, enviando2fa: false });
            return;
          }
          const conn = res.connection;
          const conectado = conn.status === "CONNECTED";
          patch(system, {
            status: conn.status,
            fase: faseDoStatus(conn.status),
            candidates: null,
            enviando2fa: false,
            qrFile: conectado ? null : s.qrFile,
            secret: conectado ? "" : s.secret,
            erro: conectado
              ? null
              : conn.error ||
                "Ainda não conectado. Confira o print/código e tente novamente.",
          });
        }
      } catch (e) {
        // mfa-code devolve erro tipado (INVALID) quando o código não confere;
        // mantemos o passo aberto para o advogado digitar o código mais recente.
        patch(system, { enviando2fa: false, erro: mensagemErro(e) });
      }
    },
    [sistemas, mfaCodeMut, mfaSeedMut, patch],
  );

  /** Pula o 2FA de um sistema: não envia nada, deixa a conexão como está. */
  const pular = useCallback(
    (system: string) => patch(system, { fase: "pulado", erro: null }),
    [patch],
  );

  const iniciando = sistemas.some((s) => s.fase === "conectando");
  // O fluxo terminou quando nenhum sistema está pendente/conectando/aguardando 2FA.
  const resolvido =
    passo === "conectar" &&
    sistemas.every((s) => ["conectado", "pulado", "erro"].includes(s.fase));
  const algumConectado = sistemas.some((s) => s.fase === "conectado");
  const totalConectaveis = sistemas.length;
  const conectados = sistemas.filter((s) => s.fase === "conectado").length;

  return {
    // catálogo de certificados
    carregandoCerts,
    erroCerts,
    usable,
    semCert,
    certRef,
    setCertRef,
    selectedCertRef,
    precisaCert,
    // navegação
    passo,
    setPasso,
    court,
    // estado por sistema
    sistemas,
    setQrFile,
    setSecret,
    setCode,
    // ações
    conectar,
    reconectar,
    enviarMfa,
    pular,
    // derivados
    iniciando,
    resolvido,
    algumConectado,
    totalConectaveis,
    conectados,
    ocupado: iniciando || sistemas.some((s) => s.enviando2fa),
  };
}
