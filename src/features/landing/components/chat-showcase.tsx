"use client";

import {
  ArrowUpRight,
  FileText,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { chatExamples } from "../content";

export function ChatShowcase() {
  return (
    <div className="lp-chat-showcase">
      <div className="lp-chat-top">
        <span>
          <Sparkles size={17} aria-hidden="true" />
          Assistente AtJud
        </span>
        <span>EXEMPLOS INTERATIVOS</span>
      </div>
      <Tabs defaultValue="autos">
        <div className="lp-chat-tabs">
          <TabsList aria-label="O que você pode pedir ao chat">
            {chatExamples.map((example) => (
              <TabsTrigger key={example.id} value={example.id}>
                {example.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {chatExamples.map((example) => (
          <TabsContent key={example.id} value={example.id} keepMounted>
            <figure className="lp-chat-example">
              <div className="lp-chat-question">
                <span>
                  <MessageSquareText size={15} aria-hidden="true" />
                  VOCÊ
                </span>
                <blockquote>{example.question}</blockquote>
              </div>
              <div className="lp-chat-answer">
                <span className="lp-chat-kind">
                  <Sparkles size={14} aria-hidden="true" />
                  {example.kind}
                </span>
                {"original" in example ? (
                  <div className="lp-chat-original">
                    <small>TEXTO ORIGINAL</small>
                    <p>{example.original}</p>
                  </div>
                ) : null}
                <p>{example.answer}</p>
                <details className="lp-source-disclosure">
                  <summary>
                    <FileText size={15} aria-hidden="true" />
                    {example.source}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </summary>
                  <div>
                    <blockquote>“{example.quote}”</blockquote>
                    <small>Trecho fictício para demonstração.</small>
                  </div>
                </details>
                <span className="lp-chat-note">{example.note}</span>
              </div>
              <figcaption>
                Prévia ilustrativa com respostas predefinidas. O chat do seu
                escritório usa o contexto disponível do processo.
              </figcaption>
            </figure>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
