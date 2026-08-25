"use client";

// Step Assinatura (Fatia 2b — assinatura REAL do PDF).
// Fluxo: user seleciona um certificado ativo do tenant → clica Assinar.
// BE gera PDF (maroto) → chama GCP KMS via cert slice → aplica PAdES via
// digitorus/pdfsign → sobe PDF assinado no storage → marca SIGNED.
// A senha do .pfx NÃO é pedida aqui — vem cifrada com o cert (trade-off
// documentado no commit da Fatia 2b).

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCertificados } from "@/features/configuracoes/hooks/use-cert-upload";

import { useDraft } from "../hooks/use-draft";
import { useRevertToConstruction, useSignPeca } from "../hooks/use-workflow";
import { AnexosList } from "./anexos-list";
import { ConstrucaoHeader } from "./construcao-header";
import { PecaPreview } from "./peca-preview";

export function AssinaturaPage({ pecaId }: { pecaId: string }) {
  const { data: draft, isLoading } = useDraft(pecaId);
  const { data: certs, isLoading: certsLoading } = useCertificados();
  const sign = useSignPeca(pecaId);
  const revert = useRevertToConstruction(pecaId);
  const [certId, setCertId] = useState<string>("");
  const [confirming, setConfirming] = useState(false);

  const cnj = draft?.process.cnj;
  const crumbs = useMemo(
    () =>
      cnj
        ? [{ label: "Peticionamento" }, { label: `Processo ${cnj}` }]
        : [{ label: "Peticionamento" }],
    [cnj],
  );
  useSetBreadcrumb(crumbs);

  // Auto-seleção quando há um único cert ativo (UX comum — advogado só tem 1).
  const activeCerts = useMemo(
    () => (certs ?? []).filter((c) => !c.revoked_at),
    [certs],
  );
  const defaultCertId = activeCerts.length === 1 ? activeCerts[0].id : "";
  const selectedId = certId || defaultCertId;

  if (isLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }
  if (!draft) return null;

  const handleSign = () => {
    if (!selectedId) {
      toast.error("Selecione um certificado.");
      return;
    }
    sign.mutate(selectedId, {
      onError: (e) =>
        toast.error(
          e instanceof Error ? e.message : "Não foi possível assinar a peça.",
        ),
    });
  };

  const handleRevert = () => {
    revert.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível voltar (peça já assinada?)."),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConstrucaoHeader step={2} enviarDisabled backHref="/pecas" />

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-8 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-y-auto">
          <PecaPreview
            title={draft.title}
            preamble={draft.preamble}
            sections={draft.sections}
            contentHtml={draft.contentHtml}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="border-border rounded-xl border p-5">
            <h2 className="font-display text-lg font-medium">Assinar peça</h2>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              O PDF é gerado, assinado com seu certificado A1 (ICP-Brasil) e
              armazenado. Após assinar, a peça não pode mais ser editada.
            </p>

            <label className="mt-4 block">
              <span className="text-foreground text-[12px]">Certificado</span>
              <div className="mt-1.5">
                {certsLoading ? (
                  <p className="text-muted-foreground text-[12.5px]">
                    Carregando certificados…
                  </p>
                ) : activeCerts.length === 0 ? (
                  <p className="text-destructive text-[12.5px]">
                    Nenhum certificado ativo. Cadastre em Configurações →
                    Certificado.
                  </p>
                ) : (
                  <Select
                    value={selectedId}
                    onValueChange={(v) => setCertId(v ?? "")}
                    disabled={sign.isPending}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      {/* Passa o label explicitamente (subject_cn + OAB) — o
                          SelectValue default do Radix mostraria o `value`
                          (UUID) quando o SelectItem correspondente não
                          está montado no ciclo de render inicial. */}
                      <SelectValue placeholder="Escolha um certificado">
                        {(() => {
                          const c = activeCerts.find(
                            (x) => x.id === selectedId,
                          );
                          if (!c) return undefined;
                          return `${c.subject_cn}${c.oab ? ` · OAB ${c.oab}` : ""}`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activeCerts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.subject_cn}
                          {c.oab ? ` · OAB ${c.oab}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </label>

            {activeCerts.length > 0 &&
              (!confirming ? (
                <Button
                  className="mt-4 w-full"
                  onClick={() => setConfirming(true)}
                  disabled={sign.isPending || !selectedId}
                >
                  Assinar peça
                </Button>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-foreground text-[13px]">
                    Confirmar a assinatura?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleSign}
                      disabled={sign.isPending}
                    >
                      {sign.isPending ? "Assinando…" : "Confirmar"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setConfirming(false)}
                      disabled={sign.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}

            <button
              type="button"
              onClick={handleRevert}
              disabled={revert.isPending}
              className="text-muted-foreground hover:text-foreground mt-3 w-full text-[12px] underline underline-offset-2 disabled:opacity-50"
            >
              Voltar para Construção
            </button>
          </div>

          <AnexosList attachments={draft.attachments} />

          <div className="border-border/60 bg-muted/30 rounded-xl border p-4 text-[11.5px] leading-relaxed">
            <p className="text-muted-foreground">
              PAdES-BASIC · SHA-256 · chave privada protegida em GCP Cloud KMS.
              Débito: carimbo de tempo (TSA) fica pra próxima fatia.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
