"use client";

// Composição top-level da tela de Construção (etapa 2). Aqui:
//   - Carrega draft + chat (mockados)
//   - Guarda estado local: aba ativa, escopo de iteração, preview, dialog
//   - Conecta todos os hooks e roteia callbacks pros filhos "burros"
//   - Publica breadcrumb no AppShell
//
// Preview flow: uma iteração gera 1..N cards (pending). Enquanto pending > 0,
// o painel lateral esconde as tabs e mostra o TabAjusteProposto; o editor
// central vira read-only. Cada card pode ser aplicado ou descartado
// individualmente; quando pending fica vazio, volta ao estado normal.

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/mock-ui/confirm-dialog";
import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";

import {
  useChatThread,
  useRunQuickAction,
  useSendChatMessage,
} from "../hooks/use-chat";
import { useDraft, useSaveDraft } from "../hooks/use-draft";
import { useIterate, useQuickAdjust } from "../hooks/use-iterate";
import { useAssumirAutoria, useRefazerDoZero } from "../hooks/use-refazer";
import { useRunReview } from "../hooks/use-review";
import type {
  Draft,
  IterateScope,
  PendingChange,
  PreviewState,
  QuickActionKind,
  QuickAdjustKind,
} from "../types";
import { ConstrucaoHeader } from "./construcao-header";
import { ContextoSidebar } from "./contexto-sidebar";
import { EditorArea } from "./editor/editor-area";
import { PainelLateral, type PainelTab } from "./painel/painel-lateral";
import { TabAjusteProposto } from "./painel/tab-ajuste-proposto";
import { TabChat } from "./painel/tab-chat";
import { TabIterar, type TabIterarHandle } from "./painel/tab-iterar";
import { TabRevisao } from "./painel/tab-revisao";

export function ConstrucaoPage({ pecaId }: { pecaId: string }) {
  const router = useRouter();
  const { data: draft, isLoading } = useDraft(pecaId);
  const { data: messages = [] } = useChatThread(pecaId);
  const save = useSaveDraft(pecaId);
  const iterate = useIterate(pecaId);
  const quickAdjust = useQuickAdjust(pecaId);
  const assumirAutoria = useAssumirAutoria(pecaId);
  const refazerDoZeroMut = useRefazerDoZero(pecaId);
  const sendChat = useSendChatMessage(pecaId);
  const runAction = useRunQuickAction(pecaId);

  const [tab, setTab] = useState<PainelTab>("iterar");
  const [scope, setScope] = useState<IterateScope>({ kind: "whole" });
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [refazerZeroOpen, setRefazerZeroOpen] = useState(false);
  const tabIterarRef = useRef<TabIterarHandle>(null);

  // Revisão: null = ainda não rodou; [] = rodou e não achou nada; N = pendentes.
  const [reviewSuggestions, setReviewSuggestions] = useState<
    PendingChange[] | null
  >(null);
  const runReview = useRunReview(pecaId);

  // Breadcrumb
  const cnj = draft?.process.cnj;
  const crumbs = useMemo(
    () =>
      cnj
        ? [{ label: "Peticionamento" }, { label: `Processo ${cnj}` }]
        : [{ label: "Peticionamento" }],
    [cnj],
  );
  useSetBreadcrumb(crumbs);

  if (isLoading || !draft) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  // ── Preview: entra ao terminar uma iteração ───────────────────────────────
  // As changes chegam prontas do BE (SectionChange[] com category/explanation/
  // old_paragraphs/new_paragraphs já hidratados via hydrateChanges no /iterate).
  // Aceitar UMA change = PATCH /pecas/:id com a seção substituída.
  const enterPreview = (currentScope: IterateScope, changes: PendingChange[]) => {
    if (changes.length === 0) {
      toast("Nenhuma mudança sugerida.");
      return;
    }

    const applyOne = (change: PendingChange) => {
      save.mutate({
        sections: [{ id: change.sectionId, paragraphs: change.newParagraphs }],
      });
    };

    const acceptOne = (sectionId: string) => {
      setPreview((prev) => {
        if (!prev) return null;
        const change = prev.pending.find((c) => c.sectionId === sectionId);
        if (change) applyOne(change);
        const remaining = prev.pending.filter((c) => c.sectionId !== sectionId);
        if (remaining.length === 0) {
          setInputResetKey((k) => k + 1);
          toast.success("Ajuste aplicado.");
          return null;
        }
        return { ...prev, pending: remaining };
      });
    };

    const dismissOne = (sectionId: string) => {
      setPreview((prev) => {
        if (!prev) return null;
        const remaining = prev.pending.filter((c) => c.sectionId !== sectionId);
        if (remaining.length === 0) {
          setInputResetKey((k) => k + 1);
          return null;
        }
        return { ...prev, pending: remaining };
      });
    };

    const acceptAll = () => {
      setPreview((prev) => {
        if (!prev) return null;
        for (const c of prev.pending) applyOne(c);
        setInputResetKey((k) => k + 1);
        toast.success(
          prev.pending.length === 1 ? "Ajuste aplicado." : "Ajustes aplicados.",
        );
        return null;
      });
    };

    const dismissAll = () => {
      setInputResetKey((k) => k + 1);
      setPreview(null);
    };

    setPreview({
      scope: currentScope,
      scopeLabel: labelForScope(currentScope, draft),
      pending: changes,
      onAcceptOne: acceptOne,
      onDismissOne: dismissOne,
      onAcceptAll: acceptAll,
      onDismissAll: dismissAll,
    });
  };

  // ── Handlers de iteração ──────────────────────────────────────────────────
  const handleIterate = (instruction: string) => {
    const s = scope;
    iterate.mutate(
      { scope: s, instruction },
      {
        onSuccess: (res) => enterPreview(s, res.changes),
        onError: () =>
          toast.error("Não foi possível ajustar. Tente novamente."),
      },
    );
  };

  const handleQuickAdjust = (kind: QuickAdjustKind) => {
    const s = scope;
    quickAdjust.mutate(
      { scope: s, kind },
      {
        onSuccess: (res) => enterPreview(s, res.changes),
        onError: () =>
          toast.error("Não foi possível ajustar. Tente novamente."),
      },
    );
  };

  // ── Refazer seção (link no editor) → foca painel Iterar ───────────────────
  const handleRefazerSection = (sectionId: string) => {
    if (preview) return;
    setTab("iterar");
    setScope({ kind: "section", id: sectionId });
    setTimeout(() => tabIterarRef.current?.focusInput(), 0);
  };

  // ── Refazer do zero: modal → navega pra etapa 1 (PecaPartida) ────────────
  const confirmarRefazerZero = () => {
    setRefazerZeroOpen(false);
    refazerDoZeroMut.mutate(undefined, {
      onSuccess: () => {
        toast.success("Rascunho voltou para a partida.");
        router.push(`/pecas/${pecaId}`);
      },
    });
  };

  // ── Assumir autoria: banner some, aba Revisão fica disponível ────────────
  const handleAssumirAutoria = () => {
    assumirAutoria.mutate(undefined, {
      onSuccess: () => {
        setTab("revisao");
        toast.success("Autoria assumida — revise a peça e edite à vontade.");
      },
    });
  };

  // ── Revisão ───────────────────────────────────────────────────────────────
  const handleRunReview = () => {
    runReview.mutate(undefined, {
      onSuccess: (list) => setReviewSuggestions(list),
      onError: () =>
        toast.error("Não foi possível revisar a peça. Tente novamente."),
    });
  };

  const handleReviewAcceptOne = (_sectionId: string, index: number) => {
    setReviewSuggestions((prev) => {
      if (!prev) return prev;
      const s = prev[index];
      if (s) {
        save.mutate({
          sections: [{ id: s.sectionId, paragraphs: s.newParagraphs }],
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReviewDismissOne = (_sectionId: string, index: number) => {
    setReviewSuggestions((prev) =>
      prev ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleReviewAcceptAll = () => {
    setReviewSuggestions((prev) => {
      if (!prev) return prev;
      for (const s of prev) {
        save.mutate({
          sections: [{ id: s.sectionId, paragraphs: s.newParagraphs }],
        });
      }
      toast.success(prev.length === 1 ? "Sugestão aplicada." : "Sugestões aplicadas.");
      return [];
    });
  };

  const handleReviewDismissAll = () => {
    setReviewSuggestions([]);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSendChat = (text: string) => {
    sendChat.mutate(text, {
      onSettled: () => setChatResetKey((k) => k + 1),
      onError: () => toast.error("Não foi possível enviar. Tente novamente."),
    });
  };

  const handleQuickAction = (kind: QuickActionKind) => {
    runAction.mutate(kind, {
      onError: () =>
        toast.error("Não foi possível processar. Tente novamente."),
    });
  };

  const iterating = iterate.isPending || quickAdjust.isPending;
  const chatThinking = sendChat.isPending || runAction.isPending;
  const inPreview = Boolean(preview);
  const isHumanAuthor = draft.authorship === "human_taken";
  const mode = isHumanAuthor ? ("revisao" as const) : ("iterar" as const);
  // Corrige inconsistências (ex.: tab "iterar" ficou setada e agora autoria virou
  // human_taken; ou vice-versa). Cai pro chat se a work-tab do modo não bate.
  const effectiveTab: PainelTab =
    tab === "chat"
      ? "chat"
      : mode === "revisao"
        ? "revisao"
        : "iterar";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConstrucaoHeader step={1} enviarDisabled />
      <div className="flex min-h-0 flex-1">
        <ContextoSidebar draft={draft} />
        <EditorArea
          draft={draft}
          onRefazerSection={handleRefazerSection}
          onAssumirAutoria={handleAssumirAutoria}
          onRefazerDoZero={() => setRefazerZeroOpen(true)}
          onSavePreamble={(paragraphs) =>
            save.mutate({ preambleParagraphs: paragraphs })
          }
          onSaveSection={(sectionId, paragraphs) =>
            save.mutate({ sections: [{ id: sectionId, paragraphs }] })
          }
          isPreviewActive={inPreview}
          hideRefazerSection={isHumanAuthor}
        />
        <PainelLateral
          tab={effectiveTab}
          onTabChange={setTab}
          showTabs={!inPreview}
          mode={mode}
          reviewCount={reviewSuggestions?.length ?? 0}
        >
          {inPreview && preview ? (
            <TabAjusteProposto
              preview={preview}
              scopeLabel={preview.scopeLabel}
            />
          ) : effectiveTab === "iterar" ? (
            <TabIterar
              ref={tabIterarRef}
              draft={draft}
              scope={scope}
              onScopeChange={setScope}
              onSend={handleIterate}
              onQuickAdjust={handleQuickAdjust}
              onRefazerDoZero={() => setRefazerZeroOpen(true)}
              loading={iterating}
              previewActive={inPreview}
              resetKey={inputResetKey}
            />
          ) : effectiveTab === "revisao" ? (
            <TabRevisao
              suggestions={reviewSuggestions}
              loading={runReview.isPending}
              onRun={handleRunReview}
              onAcceptOne={handleReviewAcceptOne}
              onDismissOne={handleReviewDismissOne}
              onAcceptAll={handleReviewAcceptAll}
              onDismissAll={handleReviewDismissAll}
            />
          ) : (
            <TabChat
              messages={messages}
              onSend={handleSendChat}
              onQuickAction={handleQuickAction}
              assistantThinking={chatThinking}
              resetKey={chatResetKey}
            />
          )}
        </PainelLateral>
      </div>

      <ConfirmDialog
        aberto={refazerZeroOpen}
        titulo="Refazer rascunho do zero?"
        descricao="Você volta pra tela de partida (teses/tom/instruções). O conteúdo atual só é substituído quando você clicar em Gerar minuta de novo."
        confirmLabel="Refazer"
        onFechar={() => setRefazerZeroOpen(false)}
        onConfirmar={confirmarRefazerZero}
        confirmando={refazerDoZeroMut.isPending}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function labelForScope(scope: IterateScope, draft: Draft): string {
  if (scope.kind === "whole") return "Peça toda";
  const s = draft.sections.find((x) => x.id === scope.id);
  return s ? `${s.roman} — ${s.shortTitle}` : "Peça toda";
}
