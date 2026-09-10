"use client";

// Estágio GERANDO da Construção — a IA "redige" a peça em tempo real.
//
// Enquanto o SSE (/generation-stream) não emitiu o 1º chunk, mostra as etapas
// reais do processamento. Assim que o markdown começa a chegar, troca
// pelo texto renderizado (markdown→HTML via marked), progressivo e bonito pro
// cliente. O stream fica ativo enquanto `enabled` (saga EXTRACTING); o markdown
// acumulado é convertido a cada frame e injetado como HTML já formatado.
//
// Componente = JSX + binding: o streaming é orquestrado por useDraftStream (o
// único I/O), a conversão markdown→HTML é a única transformação de apresentação.

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";

import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";

import { draftKeys } from "../../hooks/use-draft";
import { useDraftStream } from "../../hooks/use-draft-stream";
import { GenerationLoading } from "./generation-loading";

// GFM ligado (tables), breaks OFF — o LLM já separa parágrafos com linha em
// branco (CommonMark). Parse síncrono: roda a cada frame durante o stream.
marked.setOptions({ gfm: true, breaks: false });

const STAGE_LABELS: Record<string, string> = {
  drafting_sections: "Redação em andamento…",
  auditing_draft: "Validando fatos, pedidos e coerência…",
  safe_fallback: "Refazendo a minuta em uma redação integral…",
};

interface Props {
  draftId: string;
  /** Ativa o SSE (tipicamente saga EXTRACTING). */
  streamEnabled: boolean;
  startedAt: string;
}

export function GerandoCenter({ draftId, streamEnabled, startedAt }: Props) {
  const qc = useQueryClient();
  const [html, setHtml] = useState("");
  const [writingStarted, setWritingStarted] = useState(false);
  const [stage, setStage] = useState("waiting");
  const [connectionError, setConnectionError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useAIExperience(
    `/v1/pecas/${draftId}/generate`,
    html.trim().length > 0,
    "first_content",
  );

  useDraftStream(draftId, {
    enabled: streamEnabled,
    startedAt,
    onDone: () => {
      void qc.invalidateQueries({ queryKey: draftKeys.detail(draftId) });
    },
    onStage: (stage) => {
      setStage(stage);
      setConnectionError(false);
    },
    onError: () => setConnectionError(true),
    onProgress: (fullMarkdown) => {
      const parsed = marked.parse(fullMarkdown, { async: false }) as string;
      const sanitized = sanitizeContentHtml(parsed);
      setHtml(sanitized);
      setConnectionError(false);
      // A retry can clear the partial text, but must not send the user back
      // to the preparation screen once the sheet has opened.
      if (sanitized.trim()) setWritingStarted(true);
    },
  });

  // Rola pro fim enquanto a IA "desce" o texto.
  useEffect(() => {
    if (html && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [html]);

  if (!writingStarted)
    return (
      <GenerationLoading stage={stage} connectionError={connectionError} />
    );

  return (
    <div className="reveal mx-auto my-6 max-w-[720px] sm:my-10">
      <div className="border-line bg-panel min-h-[400px] rounded-md border px-5 py-8 shadow-[0_8px_30px_oklch(0.27_0.012_200/8%)] sm:px-12 sm:py-12 md:px-16 md:py-14">
        <div
          role="status"
          className="text-primary mb-6 flex items-center gap-2.5 text-[12.5px]"
        >
          <Loader2
            aria-hidden
            className="size-[15px] motion-safe:animate-spin"
          />
          {connectionError
            ? "Acompanhamento interrompido. Verificando o resultado automaticamente…"
            : (STAGE_LABELS[stage] ?? "Redação em andamento…")}
        </div>

        <p className="text-muted-foreground mb-4 text-xs">
          Acompanhe a escrita. Ao concluir, a bancada abre para você revisar e
          ajustar.
        </p>
        <div
          ref={scrollRef}
          role="region"
          aria-label="Texto da peça em geração"
          aria-busy="true"
          className="font-display max-h-[62vh] overflow-y-auto text-[14.5px] leading-[1.9] [&_h1]:mb-3 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3.5 [&_ol]:pl-6 [&_p]:mb-3.5 [&_p]:text-justify [&_ul]:mb-3.5 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <div className="text-fg3 mt-3 flex items-center justify-center gap-2 text-[12px]">
        <Sparkles aria-hidden className="text-primary size-3.5" />A IA redige a
        partir da intimação e das teses — você revisa e assina.
      </div>
    </div>
  );
}
