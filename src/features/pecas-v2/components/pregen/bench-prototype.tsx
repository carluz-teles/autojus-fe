"use client";

import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import type { PecaContexto } from "../../lib/peca-contexto";
import type { Thesis } from "../../types";
import { EditorCanvas } from "../construction/editor-center";
import { ContextRail } from "./context-rail";

const CONTEXT: PecaContexto = {
  processo: {
    cnj: "Processo demonstrativo",
    classe: "Manifestação sobre documentos",
    assunto: "Conferência documental",
    orgao: "Juízo demonstrativo",
    tribunalGrau: "Dados fictícios",
    valor: "Não informado",
  },
  intimacao: {
    id: "intimation",
    tipoLabel: "Intimação",
    publishedAt: "08/09/2026",
    prazoLabel: "Conferir no processo original",
    teor: "Manifeste-se a parte sobre a documentação apresentada.",
  },
  partes: [
    {
      roleLabel: "Parte representada",
      name: "Parte autora · exemplo",
      counselLabel: "",
      isClient: true,
    },
  ],
  autos: [
    {
      id: "statement",
      name: "Demonstrativo de valores",
      meta: "Documento fictício · pp. 2–3",
      category: "Autos",
    },
  ],
};

export function BenchPrototype({
  html,
  instructions,
  theses,
  onSource,
}: {
  html: string;
  instructions: string;
  theses: Thesis[];
  onSource: (id: string) => void;
}) {
  const [tab, setTab] = useState("summary");
  const [mobilePanel, setMobilePanel] = useState<"editor" | "context" | "chat">(
    "editor",
  );
  const [edited, setEdited] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const submit = (value: string) => {
    if (!value.trim()) return;
    setMessages((previous) => [...previous, value.trim()]);
    setPrompt("");
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="bg-card flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-primary text-[10px] font-medium tracking-widest uppercase">
            Bancada de elaboração
          </p>
          <h1 className="font-display text-2xl">
            Manifestação sobre documentos
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-muted-foreground text-xs">
            {edited
              ? "Edição nesta sessão · não salva no servidor"
              : "Minuta demonstrativa · revisão pendente"}
          </span>
          <Badge variant="outline">Não protocolada</Badge>
        </div>
      </header>
      <nav
        aria-label="Painéis da bancada"
        className="flex gap-2 border-b p-3 xl:hidden"
      >
        {(
          [
            { key: "context", label: "Resumo e autos" },
            { key: "editor", label: "Peça" },
            { key: "chat", label: "Chat" },
          ] as const
        ).map((panel) => (
          <Button
            key={panel.key}
            variant={mobilePanel === panel.key ? "secondary" : "ghost"}
            aria-pressed={mobilePanel === panel.key}
            onClick={() => setMobilePanel(panel.key)}
          >
            {panel.label}
          </Button>
        ))}
      </nav>
      <div className="grid min-h-0 flex-1 xl:grid-cols-[280px_minmax(0,1fr)_300px] 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <div
          className={`${mobilePanel === "context" ? "block" : "hidden"} bg-card overflow-y-auto border-r xl:block`}
        >
          <div className="flex flex-col gap-1 border-b px-5 py-5">
            <p className="text-primary text-[10px] font-medium tracking-widest uppercase">
              Bancada jurídica
            </p>
            <h2 className="font-display text-xl">Contexto da peça</h2>
          </div>
          <ContextRail
            contexto={CONTEXT}
            highlightedDocId={null}
            openingDocId={null}
            activeTab={tab}
            onTabChange={setTab}
            onVerTeor={() => onSource("intimation")}
            onVerAuto={(doc) => onSource(doc.id)}
            summarySlot={
              <section className="flex flex-col gap-2 border-b p-4">
                <h3 className="font-medium">Objetivo da peça</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {instructions}
                </p>
              </section>
            }
            tesesSlot={
              <div className="flex flex-col gap-4 p-4">
                {theses.length ? (
                  theses.map((thesis) => (
                    <article
                      key={thesis.id}
                      className="flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <h3 className="text-sm font-medium">{thesis.label}</h3>
                      <p className="text-muted-foreground text-xs">
                        {thesis.foundation}
                      </p>
                      <Button
                        variant="link"
                        className="h-auto justify-start px-0 text-left whitespace-normal"
                        onClick={() => onSource(thesis.sourceDocumentId)}
                      >
                        {thesis.sourceLabel}
                      </Button>
                    </article>
                  ))
                ) : (
                  <p>Nenhum fundamento selecionado.</p>
                )}
              </div>
            }
          />
        </div>
        <main
          className={`${mobilePanel === "editor" ? "block" : "hidden"} bg-muted/30 min-w-0 overflow-y-auto xl:block`}
          aria-label="Editor da peça"
        >
          <EditorCanvas html={html} onChange={() => setEdited(true)} />
        </main>
        <aside
          className={`${mobilePanel === "chat" ? "flex" : "hidden"} bg-card min-h-0 flex-col border-l xl:flex`}
          aria-label="Assistente da peça"
        >
          <header className="flex flex-col gap-2 border-b p-5">
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden className="text-primary size-4" />
              <h2 className="font-display text-xl">Assistente da peça</h2>
            </div>
            <p className="text-muted-foreground text-xs">
              Contexto, fontes e redação em uma conversa.
            </p>
            <Badge variant="outline" className="self-start">
              Chat demonstrativo · sem IA
            </Badge>
          </header>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            <div className="bg-background flex flex-col gap-3 rounded-xl border p-4">
              <h3 className="font-display text-lg">O próximo ajuste é seu.</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Peça uma síntese, confira uma fonte ou refine a redação. Na
                bancada real, propostas só alteram a peça após sua aprovação.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Resumir os autos", "Revisar os pedidos"].map((text) => (
                <Button
                  key={text}
                  variant="outline"
                  size="sm"
                  onClick={() => submit(text)}
                >
                  {text}
                </Button>
              ))}
            </div>
            <div
              role="log"
              aria-label="Conversa demonstrativa"
              className="flex flex-col gap-4"
            >
              {messages.map((message, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <p className="bg-primary/5 rounded-lg border p-3 text-sm">
                    <span className="mb-1 block text-xs font-medium">Você</span>
                    {message}
                  </p>
                  <div className="flex flex-col gap-2 border-l-2 pl-3 text-sm">
                    <span className="text-primary text-xs font-medium">
                      Resposta demonstrativa
                    </span>
                    <p>
                      Esta é uma prévia visual do chat. Nenhuma análise foi
                      executada e o texto da peça não foi alterado.
                    </p>
                    <Button
                      variant="link"
                      className="h-auto justify-start px-0 text-left whitespace-normal"
                      onClick={() => onSource("statement")}
                    >
                      Consultar demonstrativo · pág. 2
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form
            className="flex flex-col gap-3 border-t p-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit(prompt);
            }}
          >
            <Field>
              <FieldLabel htmlFor="bench-demo-prompt">
                Converse sobre a peça
              </FieldLabel>
              <Textarea
                id="bench-demo-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="O que você gostaria de ajustar?"
                maxLength={2000}
              />
            </Field>
            <Button type="submit" disabled={!prompt.trim()}>
              Enviar na demonstração
              <Send data-icon="inline-end" />
            </Button>
            <p className="text-muted-foreground text-[11px]">
              Mensagens e edições ficam apenas nesta sessão.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
