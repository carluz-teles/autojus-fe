"use client";

import { Link2, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";
import { cn } from "@/lib/utils";

import type { Proposta } from "../../hooks/use-assistente";
import { useChatThread, useSendChatMessage } from "../../hooks/use-chat";
import { isProposalStale } from "../../lib/proposal-revision";
import type { ChatCitation, ChatMessage } from "../../types";

const EMPTY_MESSAGES: ChatMessage[] = [];
const CHAT_ACTIONS = ["Resumir os autos", "Revisar os pedidos"];

export function AssistentePanel({
  collapsed = false,
  columnToggle,
  draftId,
  contentRevision,
  applyToEditor,
  beforeRequest,
  onSource,
}: {
  collapsed?: boolean;
  columnToggle?: ReactNode;
  draftId: string;
  contentRevision: string;
  applyToEditor: (
    sectionRoman: string,
    newParagraphs: string[],
    expectedParagraphs?: string[],
  ) => boolean;
  beforeRequest?: () => Promise<void>;
  onSource: (documentId: string, page?: number) => void;
}) {
  const thread = useChatThread(draftId);
  const send = useSendChatMessage(draftId);
  const lastAnswer = thread.data?.at(-1);
  const answerVisible = lastAnswer?.role === "assistant" && !send.isPending;
  useAIExperience(
    `/v1/pecas/${draftId}/chat`,
    answerVisible,
    "first_content",
    lastAnswer?.id,
  );
  useAIExperience(
    `/v1/pecas/${draftId}/chat`,
    answerVisible,
    "complete",
    lastAnswer?.id,
  );
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  // Store only UI decisions, never the draft or conversation text.
  const storageKey = `chat-proposal-decisions:${draftId}`;
  const [decisions, setDecisions] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  });
  const resolve = (key: string, value: string) => {
    const next = { ...decisions, [key]: value };
    setDecisions(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  const messages = thread.data ?? EMPTY_MESSAGES;

  const submit = async (prompt = msg) => {
    if (
      !prompt.trim() ||
      prompt.trim().length > 2000 ||
      lock.current ||
      thread.isPending ||
      thread.isError
    )
      return;
    lock.current = true;
    setBusy(true);
    const sent = msg;
    try {
      await beforeRequest?.();
      await send.mutateAsync(prompt.trim());
      if (prompt === sent)
        setMsg((current) => (current === sent ? "" : current));
    } catch {
      toast.error(
        "Não foi possível enviar ao assistente. Seu pedido foi mantido.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const accept = async (proposal: Proposta) => {
    if (lock.current) return;
    if (isProposalStale(proposal, contentRevision)) {
      toast.error(
        "Esta proposta foi criada para uma versão anterior da peça. Gere uma nova proposta para aplicar com segurança.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await beforeRequest?.();
      if (
        !applyToEditor(
          proposal.sectionRoman,
          proposal.newParagraphs,
          proposal.oldParagraphs,
        )
      ) {
        toast.error(
          "O trecho mudou ou contém formatação complexa. Peça uma nova proposta; suas edições foram preservadas.",
        );
        return;
      }
      resolve(proposal.key, "Aplicada no editor");
      await beforeRequest?.();
      toast.success("Ajuste aplicado e salvo.");
    } catch {
      toast.error(
        "Não foi possível salvar o texto. Confira o estado de salvamento da peça.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <aside
      aria-label="Assistente da peça"
      className="bg-card flex h-full min-h-0 w-full flex-col"
    >
      <header
        className={cn(
          "flex shrink-0 flex-col gap-3 border-b p-5",
          collapsed && "xl:border-b-0 xl:px-1 xl:py-3",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex min-w-0 items-center gap-2.5",
              collapsed && "xl:hidden",
            )}
          >
            <MessageSquare className="text-primary size-4" aria-hidden />
            <h2 className="font-display text-xl">Assistente da peça</h2>
          </div>
          {columnToggle}
        </div>
        <div className={cn("flex flex-col gap-3", collapsed && "xl:hidden")}>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Contexto, fontes e redação em uma conversa.
          </p>
          <Badge variant="outline" className="self-start">
            Você aprova cada alteração
          </Badge>
        </div>
      </header>
      <div
        id="draft-assistant-content"
        className={cn(
          "flex min-h-0 flex-1 flex-col motion-safe:animate-[rise_180ms_ease-out]",
          collapsed && "xl:hidden",
        )}
      >
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent
                className="gap-5 p-5"
                aria-label="Conversa com o assistente"
              >
                <MessageScrollerItem messageId="introduction">
                  {thread.isPending && (
                    <p role="status" className="text-muted-foreground text-xs">
                      Carregando conversa…
                    </p>
                  )}
                  {thread.isError && (
                    <p role="alert" className="text-xs">
                      Não foi possível carregar a conversa.{" "}
                      <button
                        type="button"
                        onClick={() => void thread.refetch()}
                        className="underline"
                      >
                        Tentar novamente
                      </button>
                    </p>
                  )}
                  {!thread.isPending &&
                    !thread.isError &&
                    messages.length === 0 &&
                    !busy && (
                      <Card size="sm">
                        <CardHeader>
                          <h3 className="font-display text-lg">
                            O próximo ajuste é seu.
                          </h3>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            Peça uma síntese, confira uma fonte ou refine a
                            redação. As propostas só alteram a peça após sua
                            aprovação.
                          </p>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-2">
                          {CHAT_ACTIONS.map((prompt) => (
                            <Button
                              key={prompt}
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void submit(prompt)}
                            >
                              {prompt}
                            </Button>
                          ))}
                        </CardFooter>
                      </Card>
                    )}
                </MessageScrollerItem>
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                    className="flex flex-col gap-4"
                  >
                    <ChatBubble msg={message} onSource={onSource} />
                    {message.role === "assistant" &&
                      message.changes?.map((change, index) => {
                        const key = `${message.id}:${index}`;
                        const proposal: Proposta = {
                          ...change,
                          key,
                          pedido: "",
                        };
                        const stale = isProposalStale(
                          proposal,
                          contentRevision,
                        );
                        return (
                          <PropostaCard
                            key={key}
                            proposta={proposal}
                            disabled={busy}
                            stale={stale}
                            resolution={decisions[key]}
                            onAceitar={() => void accept(proposal)}
                            onRejeitar={() =>
                              resolve(key, "Proposta rejeitada")
                            }
                          />
                        );
                      })}
                  </MessageScrollerItem>
                ))}
                {busy && (
                  <MessageScrollerItem messageId="busy">
                    <PensandoBubble />
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
        <div className="flex-none border-t p-4">
          <Composer
            msg={msg}
            setMsg={setMsg}
            onSubmit={() => void submit()}
            disabled={busy || thread.isPending || thread.isError}
            placeholder="O que você gostaria de ajustar?"
          />
        </div>
      </div>
    </aside>
  );
}

function ChatBubble({
  msg,
  onSource,
}: {
  msg: ChatMessage;
  onSource: (documentId: string, page?: number) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <Message align={isUser ? "end" : "start"}>
      <MessageContent>
        <MessageHeader>
          {isUser ? "Você" : "Assistente · análise da peça"}
        </MessageHeader>
        <Bubble
          variant={isUser ? "tinted" : "ghost"}
          align={isUser ? "end" : "start"}
          className="max-w-full"
        >
          <BubbleContent>
            <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
            {!isUser && msg.citations.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t pt-3">
                <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                  Fontes desta resposta
                </p>
                {groupCitations(msg.citations).map((c, i) => (
                  <Button
                    variant="outline"
                    key={i}
                    type="button"
                    onClick={() =>
                      c.documentId && onSource(c.documentId, c.page)
                    }
                    disabled={!c.documentId}
                    title={c.documentId ? "Ver fonte nos autos" : undefined}
                    className="h-auto min-h-11 w-full items-start justify-start px-3 py-2.5 text-left whitespace-normal"
                  >
                    <Link2 data-icon="inline-start" aria-hidden />
                    <span className="min-w-0">
                      {c.quote ? `"${c.quote}"` : "Documento dos autos"}
                      {c.page ? ` · pág. ${c.page}` : ""}
                      {c.count > 1 && (
                        <span className="text-fg3"> ({c.count} autos)</span>
                      )}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

/** Agrupa citações pelo TRECHO (+página) — vários autos distintos podem conter o
 *  mesmo teor (ex.: várias certidões com a mesma advertência de extinção). Mostra
 *  uma linha só por trecho, com a contagem de autos; o clique leva ao 1º auto do
 *  grupo. Mesmo padrão do groupAnchors das teses. */
function groupCitations(
  citations: ChatCitation[],
): (ChatCitation & { count: number })[] {
  const byKey = new Map<string, ChatCitation & { count: number }>();
  for (const c of citations) {
    // Normaliza (minúsculas, colapsa espaços) e usa um PREFIXO do trecho: o mesmo
    // teor citado a partir de autos distintos costuma vir com excerpts de tamanho/
    // espaçamento levemente diferentes; o prefixo agrupa esses casos sem colar
    // trechos realmente distintos.
    const key = `${c.documentId}|${c.page}|${c.quote}`;
    const g = byKey.get(key);
    if (g) continue;
    else byKey.set(key, { ...c, count: 1 });
  }
  return [...byKey.values()];
}

function PensandoBubble() {
  return (
    <p
      role="status"
      className="text-muted-foreground flex items-center gap-2 text-xs"
    >
      <Loader2
        aria-hidden
        className="text-primary size-4 motion-safe:animate-spin"
      />
      Analisando a peça e as fontes…
    </p>
  );
}

// ── Compartilhados ───────────────────────────────────────────────────────────

function Composer({
  msg,
  setMsg,
  onSubmit,
  disabled,
  placeholder,
}: {
  msg: string;
  setMsg: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
}) {
  const inputId = useId();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={inputId}>Converse sobre a peça</FieldLabel>
          <Textarea
            id={inputId}
            aria-describedby={`${inputId}-help`}
            maxLength={2000}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (!disabled) onSubmit();
              }
            }}
            placeholder={placeholder}
            rows={3}
            className="max-h-48 min-h-24"
          />
          <FieldDescription id={`${inputId}-help`}>
            Enter envia · Shift + Enter cria uma linha
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={!msg.trim() || disabled}>
        Enviar mensagem <Send data-icon="inline-end" aria-hidden />
      </Button>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        A IA auxilia. A revisão e a decisão final são suas.
      </p>
    </form>
  );
}

/** Card de proposta — cabeçalho + diff (antes/depois) + Aceitar/Rejeitar. */
function PropostaCard({
  proposta,
  onAceitar,
  onRejeitar,
  disabled,
  resolution,
  stale,
}: {
  proposta: Proposta;
  onAceitar: () => void;
  onRejeitar: () => void;
  disabled: boolean;
  resolution?: string;
  stale: boolean;
}) {
  const rotulo =
    proposta.pedido ||
    [proposta.sectionRoman, proposta.sectionTitle]
      .filter(Boolean)
      .join(" — ") ||
    "peça";
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles
            className="text-primary size-3 flex-none"
            strokeWidth={1.9}
          />
          <Badge variant="outline">Proposta de ajuste</Badge>
        </div>
        <h3 className="font-display text-lg">{rotulo}</h3>
      </CardHeader>
      <CardContent>
        {stale && !resolution && (
          <p className="text-destructive mb-3 text-xs" role="status">
            Proposta desatualizada. Gere uma nova proposta para esta versão.
          </p>
        )}
        {proposta.explanation && (
          <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
            {proposta.explanation}
          </p>
        )}
        <details className="text-muted-foreground mb-4 rounded-lg border p-3">
          <summary className="cursor-pointer text-xs font-medium">
            Comparar com o texto atual
          </summary>
          {proposta.oldParagraphs.map((p, i) => (
            <p
              key={`old-${i}`}
              className="mt-3 text-xs leading-relaxed line-through"
            >
              {p}
            </p>
          ))}
        </details>
        <div className="border-primary/30 border-l-2 pl-3">
          <p className="text-primary mb-2 text-[10px] font-medium tracking-widest uppercase">
            Texto proposto
          </p>
          {proposta.newParagraphs.map((p, i) => (
            <p key={`new-${i}`} className="mb-2 text-sm leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {resolution ? (
          <p className="text-muted-foreground px-3 pb-3 text-xs" role="status">
            {resolution}
          </p>
        ) : (
          <div className="flex w-full flex-wrap gap-2">
            <Button
              type="button"
              onClick={onAceitar}
              disabled={disabled || stale}
              className="flex-1"
            >
              Aplicar ajuste
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={onRejeitar}
              disabled={disabled}
            >
              Rejeitar
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
