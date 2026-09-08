"use client";

import { Link2, MessageSquare, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { Proposta } from "../../hooks/use-assistente";
import { useChatThread, useSendChatMessage } from "../../hooks/use-chat";
import { isProposalStale } from "../../lib/proposal-revision";
import type { ChatCitation, ChatMessage } from "../../types";

const EMPTY_MESSAGES: ChatMessage[] = [];
const CHAT_ACTIONS = ["Resumir os autos", "Deixar a peça mais concisa"];

export function AssistentePanel({
  draftId,
  contentRevision,
  applyToEditor,
  beforeRequest,
  onSource,
}: {
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
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
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
  useEffect(() => {
    if (follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, busy]);

  const submit = async (prompt = msg) => {
    if (!prompt.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    follow.current = true;
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
    <aside className="border-line bg-panel flex h-full min-h-0 w-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="text-primary size-4" aria-hidden />
        <h2 className="text-sm font-medium">Assistente</h2>
      </div>
      <div
        ref={scroll}
        className="min-h-0 flex-1 overflow-y-auto p-3.5"
        onScroll={(event) => {
          const el = event.currentTarget;
          follow.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
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
            <Vazio texto="Tire dúvidas, peça uma análise ou sugira ajustes à peça. As propostas aparecem aqui e só alteram o texto quando você aceitar." />
          )}
        <div
          className="flex flex-col gap-2.5"
          aria-label="Conversa com o assistente"
        >
          {messages.map((message) => (
            <div key={message.id} className="space-y-2.5">
              <ChatBubble msg={message} onSource={onSource} />
              {message.role === "assistant" &&
                message.changes?.map((change, index) => {
                  const key = `${message.id}:${index}`;
                  const proposal: Proposta = { ...change, key, pedido: "" };
                  const stale = isProposalStale(proposal, contentRevision);
                  return (
                    <PropostaCard
                      key={key}
                      proposta={proposal}
                      disabled={busy}
                      stale={stale}
                      resolution={decisions[key]}
                      onAceitar={() => void accept(proposal)}
                      onRejeitar={() => resolve(key, "Proposta rejeitada")}
                    />
                  );
                })}
            </div>
          ))}
          {busy && <PensandoBubble />}
        </div>
      </div>
      <div className="border-line flex-none border-t px-3.5 py-3">
        <Composer
          msg={msg}
          setMsg={setMsg}
          onSubmit={() => void submit()}
          disabled={busy || thread.isPending || thread.isError}
          placeholder="Pergunte ou peça uma alteração…"
        />
        {messages.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CHAT_ACTIONS.map((prompt) => (
              <ChipButton
                key={prompt}
                disabled={busy || thread.isPending || thread.isError}
                onClick={() => void submit(prompt)}
              >
                {prompt}
              </ChipButton>
            ))}
          </div>
        )}
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
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[92%] rounded-[10px] px-3 py-2 text-[12.5px] leading-[1.55] " +
          (isUser
            ? "bg-primary text-primary-foreground"
            : "border-line bg-background text-foreground border")
        }
      >
        <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
        {!isUser && msg.citations.length > 0 && (
          <div className="border-line2 mt-2 flex flex-col gap-1 border-t pt-2">
            {groupCitations(msg.citations).map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => c.documentId && onSource(c.documentId, c.page)}
                disabled={!c.documentId}
                title={c.documentId ? "Ver fonte nos autos" : undefined}
                className="text-fg3 hover:text-primary flex items-start gap-1.5 text-left text-[10.5px] leading-[1.4] disabled:cursor-default disabled:hover:text-inherit"
              >
                <Link2 className="text-primary mt-px size-3 flex-none" />
                <span className="min-w-0">
                  {c.quote ? `"${c.quote}"` : "Documento dos autos"}
                  {c.page ? ` · pág. ${c.page}` : ""}
                  {c.count > 1 && (
                    <span className="text-fg3"> ({c.count} autos)</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
    <div className="flex justify-start">
      <div className="border-line bg-background flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[11.5px]">
        <span className="border-primary/40 border-t-primary size-3.5 animate-spin rounded-full border-2" />
        <span className="text-fg3">Analisando a peça e as fontes…</span>
      </div>
    </div>
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
  return (
    <div className="flex items-end gap-1.5">
      <textarea
        aria-label="Mensagem ao assistente"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="border-line bg-background text-foreground min-h-[38px] flex-1 resize-none rounded-[9px] border px-2.5 py-2 text-[12.5px] leading-[1.4] outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!msg.trim() || disabled}
        title="Enviar"
        className="bg-primary text-primary-foreground grid size-[38px] flex-none place-items-center rounded-[9px] disabled:opacity-50"
      >
        <Send className="size-[15px]" strokeWidth={1.9} />
      </button>
    </div>
  );
}

function ChipButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-line bg-background text-fg2 hover:border-primary/40 hover:text-primary rounded-full border px-2.5 py-1 text-[11px] disabled:opacity-50"
    >
      {children}
    </button>
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
    <div className="border-primary/30 mb-2.5 overflow-hidden rounded-[10px] border">
      <div className="border-line2 bg-primary/[0.05] flex items-center gap-1.5 border-b px-3 py-[9px]">
        <Sparkles className="text-primary size-3 flex-none" strokeWidth={1.9} />
        <span className="text-primary text-[11px] font-semibold">Proposta</span>
        <span className="text-fg3 min-w-0 truncate text-[11px]">
          · {rotulo}
        </span>
      </div>
      <div className="px-3 py-2.5">
        {stale && !resolution && (
          <p className="mb-2 text-[11px] text-amber-700" role="status">
            Proposta desatualizada. Gere uma nova proposta para esta versão.
          </p>
        )}
        {proposta.explanation && (
          <p className="text-fg3 mb-2 text-[11px] leading-[1.5]">
            {proposta.explanation}
          </p>
        )}
        <div className="mb-2">
          {proposta.oldParagraphs.map((p, i) => (
            <p
              key={`old-${i}`}
              className="text-fg3 mb-1 text-[12px] leading-[1.5] line-through"
            >
              {p}
            </p>
          ))}
        </div>
        <div className="text-green">
          {proposta.newParagraphs.map((p, i) => (
            <p key={`new-${i}`} className="mb-1 text-[12.5px] leading-[1.55]">
              {p}
            </p>
          ))}
        </div>
      </div>
      {resolution ? (
        <p className="text-muted-foreground px-3 pb-3 text-xs" role="status">
          {resolution}
        </p>
      ) : (
        <div className="flex gap-1.5 px-3 pb-3">
          <button
            type="button"
            onClick={onAceitar}
            disabled={disabled || stale}
            className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-[7px] text-[12px] font-medium"
          >
            Aceitar
          </button>
          <button
            type="button"
            onClick={onRejeitar}
            disabled={disabled}
            className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-[7px] text-[12px]"
          >
            Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="text-fg3 px-4 py-11 text-center">
      <MessageSquare
        className="mx-auto mb-2.5 size-6 opacity-60"
        strokeWidth={1.5}
      />
      <p className="text-[12.5px] leading-[1.6]">{texto}</p>
    </div>
  );
}
