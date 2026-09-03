"use client";

// Painel Assistente (à direita da Construção, só quando a peça está pronta).
// DOIS modos, alternados no topo:
//   • Ajustar   → dirige o /iterate: pede um ajuste (texto/chip) com ESCOPO
//                 (peça inteira ou uma seção) e recebe PROPOSTAS (diff), que
//                 aplicam no editor vivo ao Aceitar.
//   • Perguntar → dirige o /chat: conversa de Q&A sobre a peça e os autos, com
//                 respostas ancoradas (citações dos documentos).

import { Link2, MessageSquare, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type Proposta, useAssistente } from "../../hooks/use-assistente";
import {
  useChatThread,
  useRunQuickAction,
  useSendChatMessage,
} from "../../hooks/use-chat";
import type {
  ChatMessage,
  DraftSection,
  IterateScope,
  QuickActionKind,
} from "../../types";

type Mode = "ajustar" | "perguntar";

const CHAT_ACTIONS: { label: string; kind: QuickActionKind }[] = [
  { label: "Resumir os autos", kind: "summarize_case" },
  { label: "Sugerir teses", kind: "suggest_theses" },
  { label: "Conferir prazo", kind: "check_deadline" },
  { label: "Precedentes", kind: "find_precedents" },
];

export function AssistentePanel({
  draftId,
  applyToEditor,
  sections,
  onSource,
}: {
  draftId: string;
  /** Aplica a proposta (troca o corpo da seção) no editor vivo; false se não achar. */
  applyToEditor: (sectionRoman: string, newParagraphs: string[]) => boolean;
  /** Seções da peça — alimentam o seletor de escopo do modo Ajustar. */
  sections: DraftSection[];
  /** Destaca o documento na "Fundada em" (mesmo mecanismo do "ver fonte" das
   *  teses) — usado ao clicar numa citação de uma resposta do chat. */
  onSource: (documentId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("ajustar");

  return (
    <aside className="border-line bg-panel hidden w-80 flex-none flex-col border-l lg:flex">
      {/* header + toggle de modo */}
      <div className="border-line flex flex-none flex-col gap-2.5 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-[15px]" strokeWidth={1.8} />
          <span className="text-[13px] font-semibold">Assistente</span>
        </div>
        <div className="border-line bg-background flex rounded-[8px] border p-0.5">
          <ModeTab
            active={mode === "ajustar"}
            onClick={() => setMode("ajustar")}
          >
            Ajustar
          </ModeTab>
          <ModeTab
            active={mode === "perguntar"}
            onClick={() => setMode("perguntar")}
          >
            Perguntar
          </ModeTab>
        </div>
      </div>

      {mode === "ajustar" ? (
        <AjustarMode
          draftId={draftId}
          applyToEditor={applyToEditor}
          sections={sections}
        />
      ) : (
        <PerguntarMode draftId={draftId} onSource={onSource} />
      )}
    </aside>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-[6px] px-2 py-1 text-[11.5px] font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-fg2 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

// ── Modo AJUSTAR (iterate) ───────────────────────────────────────────────────

function AjustarMode({
  draftId,
  applyToEditor,
  sections,
}: {
  draftId: string;
  applyToEditor: (sectionRoman: string, newParagraphs: string[]) => boolean;
  sections: DraftSection[];
}) {
  const { propostas, pensando, chips, enviar, usarChip, aceitar, rejeitar } =
    useAssistente(draftId, applyToEditor);
  const [msg, setMsg] = useState("");
  // Escopo: "whole" ou o id de uma seção. Guardamos o id ("" = peça inteira).
  const [scopeId, setScopeId] = useState("");
  const scope: IterateScope = scopeId
    ? { kind: "section", sectionId: scopeId }
    : { kind: "whole" };

  const submit = () => {
    if (!msg.trim() || pensando) return;
    enviar(msg, scope);
    setMsg("");
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {pensando && <PensandoCard />}
        {propostas.map((p) => (
          <PropostaCard
            key={p.key}
            proposta={p}
            onAceitar={() => aceitar(p)}
            onRejeitar={() => rejeitar(p)}
          />
        ))}
        {!pensando && propostas.length === 0 && (
          <Vazio texto="Nenhuma proposta pendente. Peça um ajuste abaixo e ele aparece aqui." />
        )}
      </div>

      <div className="border-line flex-none border-t px-3.5 py-3">
        <div className="text-fg3 mb-2 flex items-center gap-1.5 text-[10.5px]">
          <span className="flex-none">Ajustando:</span>
          <Select
            value={scopeId || "whole"}
            onValueChange={(v) => setScopeId(!v || v === "whole" ? "" : v)}
          >
            <SelectTrigger className="h-auto min-h-0 w-auto rounded-full border px-2 py-[3px] text-[10.5px] font-medium">
              <SelectValue>
                {scopeId
                  ? (() => {
                      const s = sections.find((x) => x.id === scopeId);
                      return s
                        ? `${s.roman} — ${s.shortTitle || s.title}`
                        : "peça inteira";
                    })()
                  : "peça inteira"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whole">peça inteira</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.roman} — {s.shortTitle || s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Composer
          msg={msg}
          setMsg={setMsg}
          onSubmit={submit}
          disabled={pensando}
          placeholder="Peça um ajuste…"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <ChipButton
              key={c.kind}
              disabled={pensando}
              onClick={() => usarChip(c.kind, scope)}
            >
              {c.label}
            </ChipButton>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Modo PERGUNTAR (chat Q&A) ────────────────────────────────────────────────

function PerguntarMode({
  draftId,
  onSource,
}: {
  draftId: string;
  onSource: (documentId: string) => void;
}) {
  const thread = useChatThread(draftId);
  const send = useSendChatMessage(draftId);
  const quick = useRunQuickAction(draftId);
  const [msg, setMsg] = useState("");
  const pensando = send.isPending || quick.isPending;
  const mensagens = thread.data ?? [];

  const submit = () => {
    if (!msg.trim() || pensando) return;
    send.mutate(msg.trim());
    setMsg("");
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {mensagens.length === 0 && !pensando && (
          <Vazio texto="Pergunte sobre a peça, o teor da intimação ou os autos. As respostas se apoiam nos documentos do processo." />
        )}
        <div className="flex flex-col gap-2.5">
          {mensagens.map((m) => (
            <ChatBubble key={m.id} msg={m} onSource={onSource} />
          ))}
          {pensando && <PensandoBubble />}
        </div>
      </div>

      <div className="border-line flex-none border-t px-3.5 py-3">
        <Composer
          msg={msg}
          setMsg={setMsg}
          onSubmit={submit}
          disabled={pensando}
          placeholder="Faça uma pergunta…"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHAT_ACTIONS.map((a) => (
            <ChipButton
              key={a.kind}
              disabled={pensando}
              onClick={() => quick.mutate(a.kind)}
            >
              {a.label}
            </ChipButton>
          ))}
        </div>
      </div>
    </>
  );
}

function ChatBubble({
  msg,
  onSource,
}: {
  msg: ChatMessage;
  onSource: (documentId: string) => void;
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
            {msg.citations.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => c.documentId && onSource(c.documentId)}
                disabled={!c.documentId}
                title={c.documentId ? "Ver fonte nos autos" : undefined}
                className="text-fg3 hover:text-primary flex items-start gap-1.5 text-left text-[10.5px] leading-[1.4] disabled:cursor-default disabled:hover:text-inherit"
              >
                <Link2 className="text-primary mt-px size-3 flex-none" />
                <span className="min-w-0">
                  {c.quote ? `"${c.quote}"` : "Documento dos autos"}
                  {c.page ? ` · pág. ${c.page}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PensandoBubble() {
  return (
    <div className="flex justify-start">
      <div className="border-line bg-background flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[11.5px]">
        <span className="border-primary/40 border-t-primary size-3.5 animate-spin rounded-full border-2" />
        <span className="text-fg3">Consultando os autos…</span>
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
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
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
}: {
  proposta: Proposta;
  onAceitar: () => void;
  onRejeitar: () => void;
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
      <div className="flex gap-1.5 px-3 pb-3">
        <button
          type="button"
          onClick={onAceitar}
          className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-[7px] text-[12px] font-medium"
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={onRejeitar}
          className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-[7px] text-[12px]"
        >
          Rejeitar
        </button>
      </div>
    </div>
  );
}

function PensandoCard() {
  return (
    <div className="border-line mb-2.5 rounded-[10px] border p-3">
      <div className="text-primary mb-2.5 flex items-center gap-2 text-[11.5px]">
        <span className="border-primary/40 border-t-primary size-3.5 animate-spin rounded-full border-2" />
        Analisando a peça…
      </div>
      <div className="bg-hover mb-2 h-2.5 w-[90%] animate-pulse rounded" />
      <div className="bg-hover h-2.5 w-[70%] animate-pulse rounded" />
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
