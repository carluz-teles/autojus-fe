"use client";

// Painel Assistente (à direita da Construção, só quando a peça está pronta).
// Header ✦ Assistente; corpo com as PROPOSTAS (diff por seção) / estado
// "pensando" / vazio; composer com escopo + textarea + enviar + chips de ajuste
// rápido. Dirige o /iterate do BE via useAssistente. Componente = JSX + binding.

import { MessageSquare, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { type Proposta, useAssistente } from "../../hooks/use-assistente";

export function AssistentePanel({
  draftId,
  applyToEditor,
}: {
  draftId: string;
  /** Aplica a proposta (troca o corpo da seção) no editor vivo; false se não achar. */
  applyToEditor: (sectionRoman: string, newParagraphs: string[]) => boolean;
}) {
  const { propostas, pensando, chips, enviar, usarChip, aceitar, rejeitar } =
    useAssistente(draftId, applyToEditor);
  const [msg, setMsg] = useState("");

  const submit = () => {
    if (!msg.trim() || pensando) return;
    enviar(msg);
    setMsg("");
  };

  return (
    <aside className="border-line bg-panel hidden w-80 flex-none flex-col border-l lg:flex">
      {/* header */}
      <div className="border-line flex flex-none items-center gap-2 border-b px-4 py-3">
        <Sparkles className="text-primary size-[15px]" strokeWidth={1.8} />
        <span className="text-[13px] font-semibold">Assistente</span>
      </div>

      {/* corpo */}
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

        {!pensando && propostas.length === 0 && <Vazio />}
      </div>

      {/* composer */}
      <div className="border-line flex-none border-t px-3.5 py-3">
        <div className="text-fg3 mb-2 flex items-center gap-1.5 text-[10.5px]">
          <span>Ajustando:</span>
          <span className="border-line bg-hover text-fg2 rounded-full border px-2 py-[3px] text-[10.5px] font-medium">
            peça inteira
          </span>
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Peça um ajuste ou faça uma pergunta…"
            rows={1}
            className="border-line bg-background text-foreground min-h-[38px] flex-1 resize-none rounded-[9px] border px-2.5 py-2 text-[12.5px] leading-[1.4] outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!msg.trim() || pensando}
            title="Enviar"
            className="bg-primary text-primary-foreground grid size-[38px] flex-none place-items-center rounded-[9px] disabled:opacity-50"
          >
            <Send className="size-[15px]" strokeWidth={1.9} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.kind}
              type="button"
              onClick={() => usarChip(c.kind)}
              disabled={pensando}
              className="border-line bg-background text-fg2 hover:border-primary/40 hover:text-primary rounded-full border px-2.5 py-1 text-[11px] disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
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
        {/* Antigo (riscado) sobre Proposto (verde) — em blocos separados, mais
            legível que o diff intercalado. */}
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

function Vazio() {
  return (
    <div className="text-fg3 px-4 py-11 text-center">
      <MessageSquare
        className="mx-auto mb-2.5 size-6 opacity-60"
        strokeWidth={1.5}
      />
      <p className="text-[12.5px] leading-[1.6]">
        Nenhuma proposta pendente. Peça um ajuste abaixo e ele aparece aqui.
      </p>
    </div>
  );
}
