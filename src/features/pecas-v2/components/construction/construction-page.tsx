"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FilingStatusNotice } from "@/features/filing/filing-status";
import { PreparationWorkspace } from "@/features/filing/preparation-popover";
import { useApi } from "@/lib/api/use-api";
import { htmlToText } from "@/lib/html/html-to-text";

import { useConstruction } from "../../hooks/use-construction";
import { useContentSave } from "../../hooks/use-content-save";
import { draftKeys } from "../../hooks/use-draft";
import { useThesisBatch } from "../../hooks/use-thesis-batch";
import { draftToPecaContexto } from "../../lib/peca-contexto";
import type { Draft } from "../../types";
import { ContextRail } from "../pregen/context-rail";
import { TesesRail } from "../pregen/teses-rail";
import { TopBar } from "../pregen/top-bar";
import type { RichEditorHandle } from "../rich-editor/rich-editor";
import { AssistentePanel } from "./assistente-panel";
import { EditorCenter } from "./editor-center";
import { GerandoCenter } from "./gerando-center";
import { PdfDrawer } from "./pdf-drawer";
import { PdfPreview } from "./pdf-preview";
import { ProvidenceContext } from "./providence-context";
import { SourceActions } from "./source-actions";
import { TeorDrawer } from "./teor-drawer";

type Version = { id: string; content_html: string; created_at: string };
export function ConstructionPage({ id }: { id: string }) {
  const h = useConstruction(id);
  const { draft } = h;
  const thesisBatch = useThesisBatch(h.theses.theses);
  const fetcher = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const save = useContentSave(id, draft);
  const editor = useRef<RichEditorHandle | null>(null);
  const [panel, setPanel] = useState<"context" | "assistant" | null>(null);
  const [contextTab, setContextTab] = useState("");
  const [teorOpen, setTeorOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [preview, setPreview] = useState<Version | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveHTML, setLiveHTML] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const generationActive =
    h.isGenerating || h.regenerating || h.stage === "gerando";
  const applyingRef = useRef(false);
  const wasGenerating = useRef(generationActive);
  useEffect(() => {
    if (
      wasGenerating.current &&
      !generationActive &&
      draft?.contentRevision &&
      !save.queue.dirty
    ) {
      save.queue.acknowledge(draft.contentRevision);
    }
    wasGenerating.current = generationActive;
  }, [generationActive, draft?.contentRevision, save.queue]);
  const guard = async (action: () => void | Promise<void>) => {
    try {
      await save.flush();
      await action();
    } catch {
      toast.error(
        "Não foi possível salvar. Sua edição continua preservada nesta sessão.",
      );
    }
  };
  // Intercept in-app links while a save is pending; browser close uses beforeunload.
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        !save.queue.dirty ||
        e.metaKey ||
        e.ctrlKey ||
        a.target === "_blank" ||
        a.origin !== location.origin
      )
        return;
      e.preventDefault();
      void save.queue
        .flush()
        .then(() => router.push(a.pathname + a.search))
        .catch(() => toast.error("Corrija o salvamento antes de sair."));
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [save.queue, router]);
  const refresh = () =>
    qc.invalidateQueries({ queryKey: draftKeys.detail(id) });
  const source = (sourceId: string, page?: number) => {
    if (!sourceId || sourceId === draft?.intimation.id) {
      if (draft?.intimation.id && draft.intimation.teor.trim())
        setTeorOpen(true);
      else toast("Esta referência não possui teor de intimação disponível.");
    } else {
      const d = draft
        ? draftToPecaContexto(draft).autos.find((a) => a.id === sourceId)
        : null;
      h.verAuto({
        ...d,
        id: sourceId,
        name: d?.name ?? "Documento de origem",
        meta: d?.meta ?? "",
        initialPage: page,
      });
    }
  };
  const applyTheses = async (ids = h.theses.selectedIds) => {
    if (busy || generationActive || applyingRef.current)
      throw new Error("Geração em andamento");
    applyingRef.current = true;
    setBusy(true);
    try {
      await save.flush();
      await h.regenerateWithTheses(ids, save.queue.revision);
      thesisBatch.reset();
      setLiveHTML(null);
      setChecked(false);
    } catch (error) {
      toast.error(
        "Não foi possível iniciar a geração. O texto e a seleção foram mantidos; confira se a peça mudou em outra aba.",
      );
      throw error;
    } finally {
      applyingRef.current = false;
      setBusy(false);
    }
  };
  const persistProposal = async (html: string) => {
    await save.flush();
    const result = await fetcher<{ data: { revision: string } }>(
      `/v1/pecas/${id}/content-html`,
      {
        method: "PUT",
        body: {
          content_html: html,
          revision: save.queue.revision,
        },
      },
    );
    save.acknowledge(result.data.revision);
    setLiveHTML(html);
    editor.current?.setHtml(html);
    qc.setQueryData<Draft>(draftKeys.detail(id), (d) =>
      d
        ? {
            ...d,
            contentHtml: html,
            contentRevision: result.data.revision,
            contentEdited: true,
          }
        : d,
    );
    await refresh();
    await qc.invalidateQueries({ queryKey: ["pecas-v2", "theses", id] });
  };
  const exportPDF = async () => {
    setBusy(true);
    try {
      await save.flush();
      const r = await fetcher<{ data: { url: string } }>(
        `/v1/pecas/${id}/export`,
        { query: { format: "pdf" } },
      );
      setPdf(r.data.url);
    } catch {
      toast.error("Não foi possível preparar o PDF.");
    } finally {
      setBusy(false);
    }
  };
  if (h.isLoading)
    return (
      <p role="status" className="p-6">
        Carregando peça…
      </p>
    );
  if (!draft || h.isError)
    return (
      <div className="p-6">
        <p>Não foi possível carregar a peça.</p>
        <Button onClick={h.voltar}>Voltar à origem</Button>
      </div>
    );
  if (!h.hasOrigin)
    return (
      <PageFrame
        header={<ShellBackLink href="/intimacoes" label="Intimações" />}
      >
        <div className="flex flex-col items-start gap-4 p-6">
          <h1 className="font-display text-2xl">
            Esta peça não tem intimação de origem
          </h1>
          <p className="text-muted-foreground text-sm">
            A construção de peças começa por uma intimação, cujo teor orienta os
            fundamentos e a minuta.
          </p>
          <Button nativeButton={false} render={<Link href="/intimacoes" />}>
            Abrir intimações
          </Button>
        </div>
      </PageFrame>
    );
  const ready =
    h.stage === "pronta" || (h.stage === "falha" && !!draft.contentHtml);
  const pending = Array.from(
    new Set(
      (liveHTML ?? draft.contentHtml ?? "").match(/\[PENDENTE:[^\]]*\]/gi) ??
        [],
    ),
  );
  const state =
    h.stage === "falha"
      ? "Falha na geração"
      : generationActive
        ? "Gerando"
        : draft.sentToSigningAt
          ? "Elaboração concluída"
          : ready
            ? "Em elaboração"
            : "Teses";
  return (
    <PreparationWorkspace
      draftId={id}
      cnj={draft.process.cnj}
      pieceType={draft.pieceType}
      beforePrepare={save.flush}
      disabled={
        busy ||
        generationActive ||
        pending.length > 0 ||
        draft.status === "FILED"
      }
      onOpenAttachments={() => {
        setContextTab("attachments");
        setPanel("context");
      }}
    >
      {({ trigger, attachments, status: filingStatus }) => (
        <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col pb-20 text-sm sm:pb-0">
          <TopBar
            title={draft.title}
            cnjShort={draft.process.cnj}
            state={state}
            onBack={() => void guard(h.voltar)}
            onSalvar={
              ready
                ? () =>
                    void guard(() => {
                      toast.success("Texto salvo.");
                    })
                : undefined
            }
            podeSalvar={ready && !busy && !generationActive}
            salvando={save.state === "saving"}
            saveLabel={
              {
                saved: "Salvo",
                dirty: "Alterações pendentes",
                saving: "Salvando…",
                error: "Falha ao salvar",
              }[save.state]
            }
            onRename={
              generationActive
                ? undefined
                : (title) =>
                    void guard(async () => {
                      await fetcher(`/v1/pecas/${id}`, {
                        method: "PATCH",
                        body: {
                          title,
                          content: htmlToText(
                            editor.current?.getHTML() ??
                              draft.contentHtml ??
                              "",
                          ),
                        },
                      });
                      await refresh();
                    })
            }
            actions={
              ready && !generationActive ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !!draft.sentToSigningAt}
                    onClick={() => {
                      setChecked(false);
                      setCompletionOpen(true);
                    }}
                  >
                    Concluir elaboração
                  </Button>
                  {trigger}
                </>
              ) : undefined
            }
          />
          {filingStatus}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
            <Button
              size="sm"
              variant={panel === "context" ? "secondary" : "ghost"}
              className="lg:hidden"
              aria-pressed={panel === "context"}
              onClick={() => setPanel(panel === "context" ? null : "context")}
            >
              Contexto e fontes
            </Button>
            {ready && (
              <>
                <Button
                  size="sm"
                  variant={panel === "assistant" ? "secondary" : "ghost"}
                  className="lg:hidden"
                  aria-pressed={panel === "assistant"}
                  onClick={() =>
                    setPanel(panel === "assistant" ? null : "assistant")
                  }
                >
                  Assistente
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void guard(async () => {
                      const r = await fetcher<{ data: Version[] }>(
                        `/v1/pecas/${id}/content-versions`,
                      );
                      setVersions(r.data);
                    })
                  }
                >
                  Versões
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void exportPDF()}
                >
                  Visualizar PDF
                </Button>
              </>
            )}
            <span
              role="status"
              className="text-muted-foreground ml-auto text-xs sm:hidden"
            >
              {
                {
                  saved: "Salvo",
                  dirty: "Alterações pendentes",
                  saving: "Salvando…",
                  error: "Falha ao salvar",
                }[save.state]
              }
            </span>
          </div>
          <FilingStatusNotice
            draftId={id}
            enabled={
              Boolean(draft.signedAt) ||
              draft.status === "SIGNED" ||
              draft.status === "FILED"
            }
          />
          {save.state === "error" && (
            <div role="alert" className="bg-destructive/10 px-4 py-3">
              Não foi possível salvar. Se outra sessão alterou o texto, compare
              as versões antes de continuar.{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void guard(() => {})}
              >
                Tentar salvar
              </Button>
            </div>
          )}
          {save.recovery && (
            <div className="bg-muted px-4 py-3">
              Há uma edição local que não foi salva.
              <Button
                variant="link"
                onClick={() =>
                  setPreview({
                    id: "local",
                    content_html: save.recovery!,
                    created_at: "",
                  })
                }
              >
                Comparar e recuperar
              </Button>
              <Button variant="ghost" onClick={save.discardRecovery}>
                Descartar cópia local
              </Button>
            </div>
          )}
          {h.stage === "falha" && (
            <div role="alert" className="bg-destructive/10 px-4 py-3">
              A geração falhou. O conteúdo anterior foi preservado.
              <Button
                variant="outline"
                onClick={() =>
                  draft.contentHtml
                    ? void applyTheses().catch(() => {})
                    : h.gerarMinuta()
                }
                disabled={busy || generationActive}
              >
                Tentar novamente
              </Button>
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            <div
              className={
                panel === "context"
                  ? "bg-card w-full shrink-0 overflow-y-auto border-r md:w-80"
                  : "bg-card hidden shrink-0 overflow-y-auto border-r lg:block lg:w-64 xl:w-80"
              }
            >
              <div className="flex h-11 items-center border-b px-4">
                <h2 className="text-sm font-medium">Contexto da peça</h2>
              </div>
              <ContextRail
                activeTab={
                  contextTab || (h.stage === "pregen" ? "grounds" : "summary")
                }
                onTabChange={setContextTab}
                attachmentsSlot={attachments}
                contexto={draftToPecaContexto(draft)}
                summarySlot={
                  <>
                    <div className="border-b p-4">
                      <p className="font-medium">Objetivo da peça</p>
                      <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">
                        {draft.instructions ||
                          "Objetivo não confirmado nesta peça."}
                      </p>
                    </div>
                    {draft.actionItemId && (
                      <ProvidenceContext id={draft.actionItemId} />
                    )}
                  </>
                }
                highlightedDocId={null}
                onVerTeor={() => setTeorOpen(true)}
                onVerAuto={h.verAuto}
                openingDocId={null}
                documentActions={
                  <SourceActions
                    courtRecordId={draft.process.courtRecordId}
                    draftId={id}
                  />
                }
                tesesSlot={
                  <TesesRail
                    theses={h.theses.theses}
                    selectedCount={h.theses.selectedCount}
                    isLoading={h.theses.isLoading}
                    isError={h.theses.isError}
                    onToggle={(t) =>
                      h.stage === "pregen"
                        ? h.theses.toggle(t)
                        : thesisBatch.toggle(t)
                    }
                    batch={
                      h.stage === "pregen"
                        ? undefined
                        : {
                            ...thesisBatch,
                            apply: () => applyTheses(thesisBatch.ids),
                          }
                    }
                    onFonte={source}
                    teorSourceId={draft.intimation.id}
                    isRegenerating={h.theses.isRegenerating}
                    isApplying={generationActive}
                    disabled={
                      busy ||
                      !!h.theses.isTogglingId ||
                      draft.status !== "DRAFT"
                    }
                    pregen={h.stage === "pregen"}
                    onRegenerate={h.theses.regenerate}
                  />
                }
              />
            </div>
            <main
              className={`bg-muted/30 min-w-0 flex-1 overflow-y-auto ${panel ? "hidden md:block" : ""}`}
            >
              {h.stage === "pregen" && (
                <div className="mx-auto flex min-h-full max-w-2xl flex-col items-start justify-center gap-4 p-6 sm:p-8">
                  <h1 className="font-display text-2xl">Construção da peça</h1>
                  <p className="text-muted-foreground text-sm">
                    {h.hasTeor
                      ? "Revise as teses e as fontes do processo. A minuta será gerada aqui e ficará disponível para edição."
                      : "O teor da intimação ainda não está disponível. Abra a intimação de origem para conferir os dados antes de gerar a minuta."}
                  </p>
                  {!h.hasTeor && (
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link href={`/intimacoes/${draft.intimation.id}`} />
                      }
                    >
                      Abrir intimação de origem
                    </Button>
                  )}
                  <p className="text-sm">
                    {h.theses.selectedCount} fundamentos selecionados
                  </p>
                  <Button
                    onClick={h.gerarMinuta}
                    disabled={
                      !h.hasTeor ||
                      h.isGenerating ||
                      h.theses.isRegenerating ||
                      h.theses.isLoading ||
                      !!h.theses.isTogglingId ||
                      h.theses.isError
                    }
                  >
                    Gerar minuta
                  </Button>
                </div>
              )}
              {generationActive && (
                <GerandoCenter
                  draftId={id}
                  tesesLabel={`${h.theses.selectedCount} fundamentos selecionados`}
                  streamEnabled={draft.sagaState === "EXTRACTING"}
                  startedAt={draft.updatedAt}
                />
              )}
              {ready && !generationActive && (
                <EditorCenter
                  draft={draft}
                  editorRef={editor}
                  regenerating={busy}
                  onChange={(html) => {
                    setLiveHTML(html);
                    setChecked(false);
                    save.change(html);
                  }}
                />
              )}
            </main>
            {(ready || h.stage === "pregen" || h.stage === "gerando") && (
              <div
                className={
                  panel === "assistant"
                    ? "min-h-0 w-full shrink-0 border-l md:w-72 2xl:w-80"
                    : "hidden min-h-0 shrink-0 border-l lg:block lg:w-64 xl:w-72 2xl:w-80"
                }
              >
                {ready && !generationActive ? (
                  <AssistentePanel
                    key={id}
                    draftId={id}
                    contentRevision={save.queue.revision}
                    beforeRequest={save.flush}
                    onSource={source}
                    applyToEditor={(roman, next, old) =>
                      editor.current?.applySectionChange(roman, next, old) ??
                      false
                    }
                  />
                ) : (
                  <div className="space-y-3 p-4">
                    <h2 className="font-medium">Objetivo da peça</h2>
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                      {draft.instructions ||
                        "Confira o objetivo e os documentos do processo antes de gerar."}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      O assistente ficará disponível para ajustar o texto após a
                      geração.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <TeorDrawer
            open={
              teorOpen &&
              !!draft.intimation.id &&
              !!draft.intimation.teor.trim()
            }
            onClose={() => setTeorOpen(false)}
            titulo="Intimação de origem"
            tipo="Teor"
            meta={`Publicação: ${draft.intimation.publishedAt || "Não informada"}`}
            conteudo={draft.intimation.teor}
          />
          <PdfDrawer doc={h.autoDrawer} onClose={h.fecharAuto} />
          <Sheet
            open={versions !== null}
            onOpenChange={(v) => {
              if (!v) setVersions(null);
            }}
          >
            <SheetContent
              title="Versões anteriores"
              description="Restaurar preserva a versão atual no histórico."
            >
              {!versions?.length && <p>Ainda não há versões anteriores.</p>}
              {versions?.map((v) => (
                <Button
                  key={v.id}
                  variant="outline"
                  className="mb-2 w-full"
                  onClick={() => setPreview(v)}
                >
                  {new Date(v.created_at).toLocaleString("pt-BR")}
                </Button>
              ))}
            </SheetContent>
          </Sheet>
          <Sheet
            open={!!preview}
            onOpenChange={(v) => {
              if (!v) setPreview(null);
            }}
          >
            <SheetContent
              title="Comparar versão"
              footer={
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (!preview) return;
                    setBusy(true);
                    void persistProposal(preview.content_html)
                      .then(() => {
                        setPreview(null);
                        save.discardRecovery();
                        toast.success("Versão restaurada.");
                      })
                      .catch(() =>
                        toast.error(
                          "Não foi possível restaurar. O texto atual foi mantido.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Restaurar esta versão
                </Button>
              }
            >
              <p className="mb-2 font-medium">Texto atual</p>
              <p className="mb-6 text-sm whitespace-pre-wrap">
                {htmlToText(liveHTML ?? draft.contentHtml ?? "")}
              </p>
              <p className="mb-2 font-medium">Versão selecionada</p>
              <p className="text-sm whitespace-pre-wrap">
                {htmlToText(preview?.content_html ?? "")}
              </p>
            </SheetContent>
          </Sheet>
          <Sheet open={completionOpen} onOpenChange={setCompletionOpen}>
            <SheetContent
              title="Concluir elaboração"
              description="Confira fatos, pedidos e documentos antes de concluir a elaboração."
            >
              <div className="space-y-5">
                <p className="text-xs whitespace-pre-wrap">
                  {draft.instructions || "Objetivo não confirmado."}
                </p>
                <div>
                  <h3 className="font-medium">Pendências no texto</h3>
                  {pending.length ? (
                    pending.map((p) => (
                      <p key={p} className="mt-2 text-sm">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Nenhum marcador de pendência encontrado. Confira também o
                      conteúdo.
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="completion-confirm"
                    checked={checked}
                    onCheckedChange={(v) => setChecked(!!v)}
                  />
                  <Label htmlFor="completion-confirm" className="leading-5">
                    Conferi os fatos, a parte representada, as fontes, os
                    pedidos e o PDF.
                  </Label>
                </div>
                <Button
                  disabled={
                    !checked ||
                    pending.length > 0 ||
                    busy ||
                    !!draft.sentToSigningAt
                  }
                  onClick={() =>
                    void guard(async () => {
                      await fetcher(`/v1/pecas/${id}/enviar-para-assinatura`, {
                        method: "POST",
                      });
                      await refresh();
                      setCompletionOpen(false);
                      toast.success(
                        "Elaboração concluída. A peça aguarda assinatura.",
                      );
                    })
                  }
                >
                  Concluir elaboração
                </Button>
                <p className="text-muted-foreground text-xs">
                  A assinatura e o protocolo são etapas posteriores.
                </p>
              </div>
            </SheetContent>
          </Sheet>
          <Sheet
            open={!!pdf}
            onOpenChange={(v) => {
              if (!v) setPdf(null);
            }}
          >
            <SheetContent
              title="PDF da minuta"
              className="max-w-4xl"
              footer={
                pdf ? (
                  <a
                    href={pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Abrir ou baixar PDF
                  </a>
                ) : undefined
              }
            >
              {pdf && <PdfPreview key={pdf} url={pdf} />}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </PreparationWorkspace>
  );
}
