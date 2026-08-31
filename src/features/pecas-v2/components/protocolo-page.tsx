"use client";

// Step Protocolo (Fatia 2a v0 — manual + Fatia 1 — protocolo automático e-SAJ).
// Com credencial e-SAJ cadastrada (Configurações → Tribunais), o advogado pode
// clicar "Protocolar automaticamente" — dispara o RPA (worker-filing) que
// preenche e envia a peça no e-SAJ. SEM credencial, ou se o RPA falhar (ainda
// em calibração contra o e-SAJ real — docs/erd-execucao-judicial-tjsp.md §16),
// o fluxo manual sempre funciona: protocola fora do sistema e volta aqui pra
// marcar. Input opcional: número/protocolo do tribunal.

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEsajCredentials } from "@/features/configuracoes/hooks/use-esaj-credential";

import { useDraft } from "../hooks/use-draft";
import {
  useApproveFiling,
  useFilePeca,
  useFilingStatus,
} from "../hooks/use-workflow";
import { AnexosList } from "./anexos-list";
import { ConstrucaoHeader } from "./construcao-header";
import { PecaPreview } from "./peca-preview";

const FILING_STATUS_LABEL: Record<string, string> = {
  ENFILEIRADO: "Enfileirado…",
  PROTOCOLANDO: "Protocolando no e-SAJ…",
  PROTOCOLADO: "Protocolada",
  FALHOU: "Falhou",
};

function AutomaticFiling({ pecaId }: { pecaId: string }) {
  const { data: credenciais, isLoading: isLoadingCred } = useEsajCredentials();
  const { data: status } = useFilingStatus(pecaId);
  const approve = useApproveFiling(pecaId);

  if (isLoadingCred) return null;

  if (!credenciais || credenciais.length === 0) {
    return (
      <div className="border-border/60 bg-muted/30 rounded-xl border p-4 text-[11.5px] leading-relaxed">
        <p className="text-muted-foreground">
          Cadastre uma{" "}
          <Link href="/settings?tab=tribunais" className="underline">
            credencial e-SAJ
          </Link>{" "}
          para protocolar automaticamente.
        </p>
      </div>
    );
  }

  const ativo =
    status?.status === "ENFILEIRADO" || status?.status === "PROTOCOLANDO";
  const falhou = status?.status === "FALHOU";
  const protocolada = status?.status === "PROTOCOLADO";

  return (
    <div className="border-border rounded-xl border p-5">
      <h2 className="font-display text-lg font-medium">
        Protocolar automaticamente
      </h2>
      <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
        Envia a peça assinada diretamente ao e-SAJ com a credencial cadastrada.
        Se falhar, protocole manualmente ao lado.
      </p>

      {status && (
        <p
          className={
            "mt-3 text-[12.5px] font-medium " +
            (falhou
              ? "text-destructive"
              : protocolada
                ? "text-success"
                : "text-muted-foreground")
          }
        >
          {FILING_STATUS_LABEL[status.status]}
          {protocolada && status.filingNumber
            ? ` — nº ${status.filingNumber}`
            : null}
          {falhou && status.failureReason ? ` — ${status.failureReason}` : null}
        </p>
      )}

      <Button
        variant="outline"
        className="mt-4 w-full"
        disabled={ativo || protocolada || approve.isPending}
        onClick={() =>
          approve.mutate(undefined, {
            onError: () =>
              toast.error("Não foi possível iniciar o protocolo automático."),
          })
        }
      >
        {ativo || approve.isPending
          ? "Protocolando…"
          : protocolada
            ? "Protocolada automaticamente"
            : falhou
              ? "Tentar novamente"
              : "Protocolar automaticamente"}
      </Button>
    </div>
  );
}

export function ProtocoloPage({ pecaId }: { pecaId: string }) {
  const { data: draft, isLoading } = useDraft(pecaId);
  const file = useFilePeca(pecaId);
  const [filingNumber, setFilingNumber] = useState("");

  const cnj = draft?.process.cnj;
  const crumbs = useMemo(
    () =>
      cnj
        ? [{ label: "Peticionamento" }, { label: `Processo ${cnj}` }]
        : [{ label: "Peticionamento" }],
    [cnj],
  );
  useSetBreadcrumb(crumbs);

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }
  if (!draft) return null;

  const handleFile = () => {
    file.mutate(filingNumber.trim(), {
      onError: () => toast.error("Não foi possível marcar como protocolada."),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConstrucaoHeader step={3} enviarDisabled backHref="/pecas" />

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-8 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-y-auto">
          <PecaPreview
            title={draft.title}
            preamble={draft.preamble}
            sections={draft.sections}
            contentHtml={draft.contentHtml}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <AutomaticFiling pecaId={pecaId} />

          <div className="border-border rounded-xl border p-5">
            <h2 className="font-display text-lg font-medium">
              Marcar como protocolada
            </h2>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              Protocole a peça no sistema do tribunal (PJe, e-SAJ, eproc) e
              volte aqui para registrar. O número do protocolo é opcional.
            </p>

            <label className="mt-4 block">
              <span className="text-foreground text-[12px]">
                Número do protocolo (opcional)
              </span>
              <Input
                className="mt-1.5"
                placeholder="ex.: 12345678"
                value={filingNumber}
                onChange={(e) => setFilingNumber(e.target.value)}
                disabled={file.isPending}
              />
            </label>

            <Button
              className="mt-4 w-full"
              onClick={handleFile}
              disabled={file.isPending}
            >
              {file.isPending ? "Salvando…" : "Marcar como protocolada"}
            </Button>
          </div>

          {draft.signedPDFURL && (
            <a
              href={draft.signedPDFURL}
              target="_blank"
              rel="noreferrer"
              className="border-border hover:bg-muted rounded-xl border px-5 py-4 text-center text-[13.5px] font-medium no-underline"
            >
              ↓ Baixar peça assinada (PDF)
            </a>
          )}

          <AnexosList attachments={draft.attachments} />

          <div className="border-border/60 bg-muted/30 rounded-xl border p-4 text-[11.5px] leading-relaxed">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Débito:</strong> o protocolo
              automático (e-SAJ) ainda está em calibração contra o portal real
              (docs/erd-execucao-judicial-tjsp.md §16) — use o registro manual
              se a tentativa automática falhar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
